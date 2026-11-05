import { describe, expect, it, vi } from "vitest";
import { profileRouter } from "@/server/trpc/routers/profile";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
const userId = "550e8400-e29b-41d4-a716-446655440001";
function caller() {
  const findMany = vi.fn().mockResolvedValue([]);
  const context = { prisma: { trade: { findMany } }, userId, supabase: {} };
  return {
    findMany,
    api: profileRouter.createCaller(
      context as unknown as Parameters<typeof profileRouter.createCaller>[0],
    ),
  };
}
describe("profile.exportPage", () => {
  it("uses authenticated ownership and bounded pages", async () => {
    const { api, findMany } = caller();
    expect(await api.exportPage({ section: "trades", limit: 2 })).toEqual({
      section: "trades",
      items: [],
      nextCursor: null,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { id: "asc" },
      take: 2,
    });
  });
  it("rejects invalid cursors and oversized requests before querying", async () => {
    const { api, findMany } = caller();
    await expect(
      api.exportPage({ section: "trades", cursor: "bad" }),
    ).rejects.toThrow();
    await expect(
      api.exportPage({ section: "trades", limit: 101 }),
    ).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });
});
