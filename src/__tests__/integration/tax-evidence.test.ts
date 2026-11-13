import { afterAll, beforeEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  uploadEvidence,
  downloadEvidence,
  linkEvidence,
  removeEvidence,
  type FiscalStorage,
} from "@/server/services/tax/evidence-service";
const url = process.env.FISCAL_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.startsWith("/fiscal_"))
)
  throw Error("Use isolated local fiscal_* database only");
const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 4 }),
    })
  : null;
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000099",
  periodId = "00000000-0000-4000-8000-000000000012",
  otherPeriod = "00000000-0000-4000-8000-000000000098";
const pdf = new TextEncoder().encode("%PDF-1.7\nQA private fixture");
function fakeStorage() {
  const files = new Map<string, Uint8Array>();
  let afterUpload: (() => Promise<void>) | undefined;
  const storage: FiscalStorage = {
    upload: async (path, bytes) => {
      if (files.has(path)) return { error: { message: "exists" } };
      files.set(path, Uint8Array.from(bytes));
      await afterUpload?.();
      return { error: null };
    },
    download: async (path) => ({
      data: files.has(path)
        ? new Blob([Uint8Array.from(files.get(path)!).buffer])
        : null,
      error: files.has(path) ? null : { message: "missing" },
    }),
    remove: async (paths) => {
      paths.forEach((p) => files.delete(p));
      return { error: null };
    },
    createSignedUrl: async (path, ttl, options) => ({
      data: {
        signedUrl: `https://signed.test/${encodeURIComponent(path)}?ttl=${ttl}&download=${encodeURIComponent(options.download)}`,
      },
      error: null,
    }),
  };
  return {
    files,
    storage,
    onUpload: (fn: () => Promise<void>) => {
      afterUpload = fn;
    },
  };
}
describe.skipIf(!db)("private fiscal evidence on isolated PostgreSQL", () => {
  beforeEach(async () => {
    await db!.taxPeriod.update({
      where: { id: periodId },
      data: { status: "OPEN" },
    });
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  async function identity() {
    const p = await db!.taxPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });
    return {
      periodId,
      expectedRevision: p.revision,
      requestId: randomUUID(),
      name: "QA-" + randomUUID() + ".pdf",
      mime: "application/pdf",
    };
  }
  it("keeps an immutable file and replays the same upload without duplicating metadata", async () => {
    const f = fakeStorage(),
      input = await identity();
    const a = (await uploadEvidence(db!, owner, input, pdf, f.storage)) as any;
    expect(a.status).toBe("AVAILABLE");
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await uploadEvidence(db!, owner, input, pdf, f.storage)).toEqual(a);
    expect(f.files.size).toBe(1);
    expect(
      await db!.taxEvidence.count({
        where: { userId: owner, name: input.name },
      }),
    ).toBe(1);
    expect((await downloadEvidence(db!, owner, a.id, f.storage)).url).toContain(
      "ttl=300",
    );
    await expect(
      downloadEvidence(db!, other, a.id, f.storage),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects attachment of another owner fiscal record", async () => {
    const f = fakeStorage(),
      a = (await uploadEvidence(
        db!,
        owner,
        await identity(),
        pdf,
        f.storage,
      )) as any;
    const income = await db!.taxIncome.create({
      data: {
        userId: other,
        periodId: otherPeriod,
        category: "OTHER",
        payer: "QA",
        recognitionDate: new Date("2026-01-01"),
        assetKey: "FIAT:HNL",
        grossAmount: "1",
        netAmount: "1",
      },
    });
    const input = await identity();
    await expect(
      linkEvidence(db!, owner, {
        ...input,
        evidenceId: a.id,
        target: "income",
        targetId: income.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      await db!.taxIncomeEvidence.count({ where: { evidenceId: a.id } }),
    ).toBe(0);
  });
  it("does not finalize an upload after the exercise closes and compensates its object", async () => {
    const f = fakeStorage();
    f.onUpload(async () => {
      await db!.taxPeriod.update({
        where: { id: periodId },
        data: { status: "CLOSED" },
      });
    });
    const input = await identity();
    await expect(
      uploadEvidence(db!, owner, input, pdf, f.storage),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(f.files.size).toBe(0);
    expect(
      (
        await db!.taxEvidence.findFirstOrThrow({
          where: { userId: owner, name: input.name },
        })
      ).status,
    ).toBe("REJECTED");
  });
  it("removes a late uploaded object when account deletion starts in flight", async () => {
    const f = fakeStorage();
    f.onUpload(async () => {
      await db!
        .$executeRaw`INSERT INTO public.account_deletion_jobs(user_id) VALUES(${owner}::uuid)`;
    });
    try {
      await expect(
        uploadEvidence(db!, owner, await identity(), pdf, f.storage),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(f.files.size).toBe(0);
    } finally {
      await db!
        .$executeRaw`DELETE FROM public.account_deletion_jobs WHERE user_id=${owner}::uuid`;
    }
  });
  it("retains an evidence version referenced by an archived return", async () => {
    const f = fakeStorage(),
      a = (await uploadEvidence(
        db!,
        owner,
        await identity(),
        pdf,
        f.storage,
      )) as any;
    const previous = await db!.taxReturn.aggregate({
      where: { periodId },
      _max: { version: true },
    });
    const ret = await db!.taxReturn.create({
      data: {
        userId: owner,
        periodId,
        version: (previous._max.version ?? 0) + 1,
        periodRevision: 1,
        snapshot: {},
        snapshotHash: "QA",
        ruleVersion: "HN-ISR-2026-v1",
        mappingVersion: "102-2026",
      },
    });
    await db!.taxReturnEvidence.create({
      data: { userId: owner, returnId: ret.id, evidenceId: a.id },
    });
    await expect(
      removeEvidence(
        db!,
        owner,
        { ...(await identity()), id: a.id },
        f.storage,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(f.files.size).toBe(1);
  });
});
