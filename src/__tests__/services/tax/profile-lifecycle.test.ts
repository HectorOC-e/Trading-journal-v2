import { describe, it, expect, vi } from "vitest";
import { exportProfilePage } from "@/server/services/profile/export-profile";
import { processAccountDeletion } from "@/server/services/profile/account-deletion";
import { PROFILE_EXPORT_SECTIONS } from "@/domains/profile/export-sections";
const userId = "00000000-0000-4000-8000-000000000001";
describe("fiscal data in profile lifecycle", () => {
  it("exports owned fiscal profiles with exact identifiers and decimal strings", async () => {
    const row = {
      id: "profile",
      rtn: "00000000000001",
      amount: "123.123456789012345678",
    };
    const db = {
      taxProfile: {
        findMany: async ({ where }: any) =>
          where.userId === userId ? [row] : [],
      },
    } as any;
    expect(PROFILE_EXPORT_SECTIONS).toContain("taxProfiles");
    const out = await exportProfilePage(db, userId, { section: "taxProfiles" });
    expect(out.items).toEqual([row]);
  });
  it("removes more than one page of private fiscal files before declaring account cleanup complete", async () => {
    const files = new Set(
      Array.from({ length: 131 }, (_, i) => `${userId}/qa-${i}.pdf`),
    );
    const db = {
      taxUploadLease: {
        count: async () => 0,
        deleteMany: async () => ({ count: 0 }),
      },
      accountDeletionJob: {
        findUnique: async () => ({ status: "pending", attempts: 0 }),
        updateMany: async () => ({ count: 1 }),
      },
      trade: { findMany: async () => [] },
      setup: { findMany: async () => [] },
      practiceAttachment: { findMany: async () => [] },
      $queryRaw: async () => [],
      user: {
        deleteMany: vi.fn(async () => ({ count: 1 })),
        findUnique: async () => null,
      },
    } as any;
    const admin = {
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
          getUserById: async () => ({
            data: { user: null },
            error: { status: 404 },
          }),
        },
      },
      storage: {
        from: (bucket: string) => ({
          list: async (prefix: string) => ({
            data:
              bucket === "tax-evidence"
                ? [...files]
                    .filter((f) => f.startsWith(prefix + "/"))
                    .slice(0, 100)
                    .map((f) => ({ id: f, name: f.slice(prefix.length + 1) }))
                : [],
            error: null,
          }),
          remove: async (paths: string[]) => {
            paths.forEach((p) => files.delete(p));
            return { error: null };
          },
        }),
      },
    } as any;
    expect(
      await processAccountDeletion(db, userId, {
        createAdmin: () => admin,
        now: () => new Date("2026-11-08T00:00:00Z"),
      }),
    ).toEqual({ ok: true, status: "completed" });
    expect(files.size).toBe(0);
  });
  it("does not complete deletion while a privileged upload is still in flight", async () => {
    const db = {
      accountDeletionJob: {
        findUnique: async () => ({ status: "pending", attempts: 0 }),
        updateMany: async () => ({ count: 1 }),
      },
      taxUploadLease: {
        count: async () => 1,
        deleteMany: async () => ({ count: 0 }),
      },
      trade: { findMany: async () => [] },
      setup: { findMany: async () => [] },
      practiceAttachment: { findMany: async () => [] },
      $queryRaw: async () => [],
      user: {
        deleteMany: async () => ({ count: 1 }),
        findUnique: async () => null,
      },
    } as any;
    const admin = {
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
          getUserById: async () => ({
            data: { user: null },
            error: { status: 404 },
          }),
        },
      },
      storage: {
        from: () => ({
          list: async () => ({ data: [], error: null }),
          remove: async () => ({ error: null }),
        }),
      },
    } as any;
    expect(
      await processAccountDeletion(db, userId, {
        createAdmin: () => admin,
        now: () => new Date(),
      }),
    ).toEqual({ ok: false, status: "pending" });
  });
});
