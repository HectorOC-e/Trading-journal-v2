import { describe, it, expect, vi } from "vitest";
import {
  requestAccountDeletion,
  processAccountDeletion,
  processAccountDeletionBatch,
} from "./account-deletion";
const id = "00000000-0000-4000-8000-000000000001";
function fixture() {
  const job = { userId: id, status: "pending", attempts: 0 };
  const db = {
    $queryRaw: vi.fn(async () => []),
    accountDeletionJob: {
      upsert: vi.fn(async () => job),
      findUnique: vi.fn(async () => job),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    trade: { findMany: vi.fn(async () => []) },
    setup: { findMany: vi.fn(async () => []) },
    practiceAttachment: { findMany: vi.fn(async () => []) },
    taxUploadLease: {
      count: vi.fn(async () => 0),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    user: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => null),
    },
  };
  const storage = {
    list: vi.fn(async () => ({ data: [], error: null })),
    remove: vi.fn(async (paths: string[]) => {
      void paths;
      return { error: null };
    }),
  };
  const admin = {
    storage: { from: vi.fn(() => storage) },
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ error: null })),
        getUserById: vi.fn(async () => ({
          data: { user: null },
          error: { status: 404 },
        })),
      },
    },
  };
  const deps = { createAdmin: () => admin, now: () => new Date("2026-11-05") };
  return { job, db, storage, admin, deps };
}
describe("durable deletion", () => {
  it("records intent before Auth and verifies DB removal", async () => {
    const f = fixture();
    f.admin.auth.admin.deleteUser.mockImplementation(async () => {
      expect(f.db.accountDeletionJob.upsert).toHaveBeenCalled();
      return { error: null };
    });
    expect(
      await requestAccountDeletion(f.db as never, id, f.deps as never),
    ).toEqual({ ok: true, status: "completed" });
    expect(f.db.user.findUnique).toHaveBeenCalled();
  });
  it.each(["storage", "auth", "database"])(
    "keeps %s failure pending with backoff",
    async (failure) => {
      const f = fixture();
      if (failure === "storage")
        f.storage.list.mockResolvedValue({
          data: [],
          error: { message: "failed" },
        } as never);
      if (failure === "auth")
        f.admin.auth.admin.deleteUser.mockResolvedValue({
          error: { status: 503 },
        } as never);
      if (failure === "database")
        f.db.user.deleteMany.mockRejectedValue(new Error("failed"));
      expect(
        await requestAccountDeletion(f.db as never, id, f.deps as never),
      ).toEqual({ ok: false, status: "pending" });
      expect(f.db.accountDeletionJob.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "pending",
            nextAttemptAt: new Date("2026-11-05T00:01:00Z"),
          }),
        }),
      );
      if (failure !== "database")
        expect(f.db.user.deleteMany).not.toHaveBeenCalled();
    },
  );
  it("accepts Auth 404 for a resumed deletion", async () => {
    const f = fixture();
    f.db.user.deleteMany.mockRejectedValueOnce(new Error("db failed"));
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    f.admin.auth.admin.deleteUser.mockResolvedValue({
      error: { status: 404 },
    } as never);
    expect(
      (await processAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(true);
  });
  it("does not execute when another invocation holds the lease", async () => {
    const f = fixture();
    f.db.accountDeletionJob.updateMany.mockResolvedValue({ count: 0 });
    expect(
      (await processAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(f.storage.list).not.toHaveBeenCalled();
    expect(f.db.accountDeletionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nextAttemptAt: { lte: f.deps.now() },
          OR: [{ leaseUntil: null }, { leaseUntil: { lte: f.deps.now() } }],
        }),
      }),
    );
  });
  it("does not delete DB after failed Auth verification", async () => {
    const f = fixture();
    f.admin.auth.admin.getUserById.mockResolvedValue({
      data: { user: null },
      error: { status: 500 },
    } as never);
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(f.db.user.deleteMany).not.toHaveBeenCalled();
  });
  it("does not falsely complete when DB verification still finds the user", async () => {
    const f = fixture();
    f.db.user.findUnique.mockResolvedValue({ id } as never);
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
  });
  it("stops before Auth when lease renewal fails", async () => {
    const f = fixture();
    f.db.accountDeletionJob.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 0 });
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(f.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it("keeps failed object removal pending before touching Auth", async () => {
    const f = fixture();
    f.db.practiceAttachment.findMany.mockResolvedValue([
      { path: `${id}/practice/image.png` },
    ] as never);
    f.storage.remove.mockResolvedValue({
      error: { message: "failed" },
    } as never);
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(f.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it("does not falsely complete when storage changes during Auth deletion", async () => {
    const f = fixture();
    let authDeleted = false;
    f.admin.auth.admin.deleteUser.mockImplementation(async () => {
      authDeleted = true;
      return { error: null };
    });
    f.storage.list.mockImplementation(
      async () =>
        ({
          data: authDeleted ? [{ id: "object", name: "late.png" }] : [],
          error: null,
        }) as never,
    );
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(f.db.user.deleteMany).not.toHaveBeenCalled();
  });
  it("retries with exponential backoff", async () => {
    const f = fixture();
    f.job.attempts = 4;
    f.storage.list.mockRejectedValue(new Error("failed"));
    await processAccountDeletion(f.db as never, id, f.deps as never);
    expect(f.db.accountDeletionJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextAttemptAt: new Date("2026-11-05T00:16:00Z"),
        }),
      }),
    );
  });
  it("keeps completed intent idempotent", async () => {
    const f = fixture();
    f.job.status = "completed";
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(true);
    expect(f.storage.list).not.toHaveBeenCalled();
  });
  it("bounds worker batches and returns aggregate counts only", async () => {
    const f = fixture();
    const findMany = vi.fn(async () => [{ userId: id }]);
    Object.assign(f.db.accountDeletionJob, { findMany });
    expect(
      await processAccountDeletionBatch(f.db as never, f.deps as never),
    ).toEqual({ processed: 1, completed: 1, pending: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, select: { userId: true } }),
    );
  });

  it("removes owned legacy orphan objects from shared trade paths", async () => {
    const f = fixture();
    f.db.$queryRaw.mockResolvedValue([
      { bucket_id: "trade-screenshots", name: "trades/legacy.png" },
    ] as never);
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(true);
    expect(f.storage.remove).toHaveBeenCalledWith(["trades/legacy.png"]);
  });
  it("does not trust another user's URL pasted into a trade", async () => {
    const f = fixture();
    f.db.trade.findMany.mockResolvedValue([
      {
        screenshotUrls: [
          "https://example.test/storage/v1/object/public/trade-screenshots/trades/someone-else.png",
        ],
      },
    ] as never);
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(true);
    expect(f.storage.remove).not.toHaveBeenCalled();
  });
  it("never contacts providers if durable intent cannot be recorded", async () => {
    const f = fixture();
    f.db.accountDeletionJob.upsert.mockRejectedValue(
      new Error("db unavailable"),
    );
    await expect(
      requestAccountDeletion(f.db as never, id, f.deps as never),
    ).rejects.toThrow("db unavailable");
    expect(f.admin.storage.from).not.toHaveBeenCalled();
  });

  it("makes progress across retries when a prefix exceeds the operation budget", async () => {
    const f = fixture();
    let remaining = 20100;
    f.storage.list.mockImplementation(
      async () =>
        ({
          data: Array.from({ length: Math.min(100, remaining) }, (_, i) => ({
            id: `object-${i}`,
            name: `file-${i}.png`,
          })),
          error: null,
        }) as never,
    );
    f.storage.remove.mockImplementation(async (paths: string[]) => {
      remaining -= paths.length;
      return { error: null };
    });
    expect(
      (await requestAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(false);
    expect(remaining).toBe(100);
    expect(f.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(
      (await processAccountDeletion(f.db as never, id, f.deps as never)).ok,
    ).toBe(true);
    expect(remaining).toBe(0);
  });
});
