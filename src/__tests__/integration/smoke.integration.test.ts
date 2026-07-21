import { describe, it, expect, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"

let userId: string | null = null
afterEach(async () => {
  if (userId) {
    await dropUser(userId)
    userId = null
  }
})

describe("integration harness", () => {
  it("connects to a real Postgres and round-trips a user", async () => {
    userId = await makeUser()
    const found = await prisma.user.findUnique({ where: { id: userId } })
    expect(found?.id).toBe(userId)
  })
})
