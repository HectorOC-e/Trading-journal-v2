import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { createTRPCContext } from "@/server/trpc/init"
import { createClient } from "@/lib/supabase/server"

const USER_ID = "550e8400-e29b-41d4-a716-446655440001"

const mockedCreateClient = vi.mocked(createClient)

function mockSupabase({
  claims,
  claimsError = null,
}: {
  claims: { sub: string } | null
  claimsError?: { message: string } | null
}) {
  const getClaims = vi.fn().mockResolvedValue({
    data: claims ? { claims } : null,
    error: claimsError,
  })
  const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
  mockedCreateClient.mockResolvedValue({ auth: { getClaims, getUser } } as never)
  return { getClaims, getUser }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createTRPCContext", () => {
  it("resolves userId from the verified JWT claims (sub)", async () => {
    mockSupabase({ claims: { sub: USER_ID } })

    const ctx = await createTRPCContext()

    expect(ctx.userId).toBe(USER_ID)
  })

  it("verifies the JWT locally instead of calling the Auth server on every request", async () => {
    // TD-019: getUser() is a network round-trip to the Auth server on every tRPC
    // call. getClaims() verifies the ES256 signature against the cached JWKS, so
    // no request should leave the process once the JWKS is warm.
    const { getClaims, getUser } = mockSupabase({ claims: { sub: USER_ID } })

    await createTRPCContext()

    expect(getClaims).toHaveBeenCalledTimes(1)
    expect(getUser).not.toHaveBeenCalled()
  })

  it("returns a null userId when there is no session", async () => {
    mockSupabase({ claims: null })

    const ctx = await createTRPCContext()

    expect(ctx.userId).toBeNull()
  })

  it("returns a null userId when the JWT fails verification", async () => {
    mockSupabase({ claims: null, claimsError: { message: "Invalid JWT signature" } })

    const ctx = await createTRPCContext()

    expect(ctx.userId).toBeNull()
  })

  it("still exposes prisma and supabase on the context", async () => {
    mockSupabase({ claims: { sub: USER_ID } })

    const ctx = await createTRPCContext()

    expect(ctx.prisma).toBeDefined()
    expect(ctx.supabase).toBeDefined()
  })
})
