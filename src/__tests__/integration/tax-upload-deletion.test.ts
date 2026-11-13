import { afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  uploadEvidence,
  type FiscalStorage,
} from "@/server/services/tax/evidence-service";
import { processAccountDeletion } from "@/server/services/profile/account-deletion";
const url = process.env.FISCAL_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
    new URL(url).pathname !== "/fiscal_leases")
)
  throw Error("Requires isolated local fiscal_leases database");
const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 4 }),
    })
  : null;
const userId = "00000000-0000-4000-8000-000000000001",
  periodId = "00000000-0000-4000-8000-000000000012";
describe.skipIf(!db)("durable private upload deletion race", () => {
  afterAll(async () => {
    await db?.$disconnect();
  });
  it("keeps cleanup retryable after its sweep, late upload, cascade and first failed compensation", async () => {
    const files = new Map<string, Uint8Array>();
    let failFirstRemove = true;
    let uploadedPath = "";
    const otherPath = "00000000-0000-4000-8000-000000000099/private.pdf";
    files.set(otherPath, new Uint8Array([1]));
    function list(prefix: string) {
      const entries = new Map<string, { id: string | null; name: string }>();
      for (const path of files.keys()) {
        if (!path.startsWith(prefix + "/")) continue;
        const rest = path.slice(prefix.length + 1),
          name = rest.split("/")[0];
        entries.set(name, { id: rest.includes("/") ? null : path, name });
      }
      return [...entries.values()].slice(0, 100);
    }
    const remove = async (paths: string[]) => {
      if (failFirstRemove) {
        failFirstRemove = false;
        return { error: { message: "transient local fixture failure" } };
      }
      paths.forEach((p) => files.delete(p));
      return { error: null };
    };
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
            data: bucket === "tax-evidence" ? list(prefix) : [],
            error: null,
          }),
          remove,
        }),
      },
    } as any;
    const cleanupDb = {
      accountDeletionJob: db!.accountDeletionJob,
      taxUploadLease: db!.taxUploadLease,
      user: db!.user,
      $queryRaw: async () => [],
      trade: { findMany: async () => [] },
      setup: { findMany: async () => [] },
      practiceAttachment: { findMany: async () => [] },
    } as any;
    const storage: FiscalStorage = {
      upload: async (path, bytes) => {
        expect(
          await db!.taxUploadLease.count({
            where: { userId, completedAt: null },
          }),
        ).toBe(1);
        await db!.accountDeletionJob.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        expect(
          await processAccountDeletion(cleanupDb, userId, {
            createAdmin: () => admin,
            now: () => new Date(),
          }),
        ).toEqual({ ok: false, status: "pending" });
        expect(await db!.user.count({ where: { id: userId } })).toBe(0);
        // The bounded privileged request resolves only AFTER the deletion sweep.
        files.set(path, Uint8Array.from(bytes));
        uploadedPath = path;
        return { error: null };
      },
      download: async () => ({ data: null, error: { message: "missing" } }),
      remove,
      createSignedUrl: async () => ({
        data: null,
        error: { message: "not used" },
      }),
    };
    const period = await db!.taxPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });
    const expectedLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        uploadEvidence(
          db!,
          userId,
          {
            periodId,
            expectedRevision: period.revision,
            requestId: randomUUID(),
            name: "private.pdf",
            mime: "application/pdf",
          },
          new TextEncoder().encode("%PDF-1.7\nQA"),
          storage,
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    } finally {
      expectedLog.mockRestore();
    }
    expect(files.has(uploadedPath)).toBe(true);
    expect(
      (await db!.accountDeletionJob.findUniqueOrThrow({ where: { userId } }))
        .status,
    ).toBe("pending");
    const afterExpiry = new Date(Date.now() + 11 * 60_000);
    expect(
      await processAccountDeletion(cleanupDb, userId, {
        createAdmin: () => admin,
        now: () => afterExpiry,
      }),
    ).toEqual({ ok: true, status: "completed" });
    expect(files.has(uploadedPath)).toBe(false);
    expect(files.has(otherPath)).toBe(true);
    expect(await db!.taxUploadLease.count({ where: { userId } })).toBe(0);
  });
});
