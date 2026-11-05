import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), getClaims: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { accountDeletionJob: { findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: mocks.getClaims } }),
}));
import { createTRPCContext } from "./init";
const id = "00000000-0000-4000-8000-000000000001";
describe("deletion context gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: id } } });
    mocks.findUnique.mockResolvedValue(null);
  });
  it("accepts an authenticated user with no intent", async () => {
    expect((await createTRPCContext()).userId).toBe(id);
  });
  it.each(["pending", "processing", "completed"])(
    "blocks stale JWT for %s intent",
    async (status) => {
      mocks.findUnique.mockResolvedValue({ userId: id, status });
      expect((await createTRPCContext()).userId).toBeNull();
    },
  );
  it("does not query intents for anonymous sessions", async () => {
    mocks.getClaims.mockResolvedValue({ data: null });
    expect((await createTRPCContext()).userId).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
