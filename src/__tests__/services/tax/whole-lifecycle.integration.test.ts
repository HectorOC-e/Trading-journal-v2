import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPeriod,
  getProfile,
  saveAccount,
  saveProfile,
} from "@/server/services/tax/profile-service";
import { saveIncome } from "@/server/services/tax/record-service";
import {
  balances,
  postTransaction,
  reverseTransaction,
  saveTransaction,
} from "@/server/services/tax/ledger-service";
import { reconcile } from "@/server/services/tax/reconciliation-service";
import {
  uploadEvidence,
  linkEvidence,
  type FiscalStorage,
} from "@/server/services/tax/evidence-service";
import { previewCalculation } from "@/server/services/tax/calculation-service";
import {
  closeReturn,
  getPeriod,
  prepareReturn,
  refreshProfileSnapshot,
  reportFiled,
  reopenPeriod,
  updateInformation,
} from "@/server/services/tax/return-service";
import { exportReturn } from "@/server/services/tax/export-service";

const url = process.env.FISCAL_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  const loopback = ["localhost", "127.0.0.1"].includes(target.hostname);
  const isolatedDatabase = target.pathname.startsWith("/fiscal_");
  const explicitLocalSupabase =
    process.env.FISCAL_TEST_SUPABASE_LOCAL === "1" &&
    target.pathname === "/postgres" &&
    target.port === "54322";
  if (!loopback || !(isolatedDatabase || explicitLocalSupabase))
    throw Error(
      "Use a loopback fiscal_* database, or explicitly opt into local Supabase on port 54322",
    );
}

const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 8 }),
    })
  : null;
const hnl = { kind: "FIAT" as const, code: "HNL" };
const owners: string[] = [];
const pdf = new TextEncoder().encode("%PDF-1.7\nQA lifecycle evidence");
function storageFixture(): FiscalStorage {
  const files = new Map<string, Uint8Array>();
  return {
    upload: async (path, bytes) => {
      files.set(path, Uint8Array.from(bytes));
      return { error: null };
    },
    download: async (path) => ({
      data: files.has(path)
        ? new Blob([Uint8Array.from(files.get(path)!).buffer])
        : null,
      error: null,
    }),
    remove: async (paths) => {
      paths.forEach((path) => files.delete(path));
      return { error: null };
    },
    createSignedUrl: async (path) => ({
      data: { signedUrl: `https://signed.test/${path}` },
      error: null,
    }),
  };
}

describe.skipIf(!db)("complete fiscal lifecycle on isolated PostgreSQL", () => {
  let owner: string;
  let periodId: string;
  let accountId: string;
  async function createOwner(id: string) {
    await db!
      .$executeRaw`INSERT INTO public.users(id,email) VALUES(${id}::uuid,${`qa-fiscal-${id}@example.invalid`})`;
  }
  beforeEach(async () => {
    owner = randomUUID();
    owners.push(owner);
    await createOwner(owner);
    await saveProfile(db!, owner, {
      requestId: randomUUID(),
      name: "QA fiscal",
      rtn: "08011999000001",
      domiciled: true,
      individualMerchant: false,
    });
    const period = await createPeriod(db!, owner, {
      requestId: randomUUID(),
      year: 2026,
    });
    periodId = period.id;
    const account = await saveAccount(db!, owner, {
      requestId: randomUUID(),
      name: "QA Banco",
      kind: "BANK",
    });
    accountId = account.id;
    const tradingAccountId = randomUUID();
    await db!
      .$executeRaw`INSERT INTO public.accounts(id,user_id,initial_balance,name,broker)
      VALUES(${tradingAccountId}::uuid,${owner}::uuid,12345.67,'QA untouched account','QA broker')`;
    await db!
      .$executeRaw`INSERT INTO public.trades(id,user_id,account_id,pnl,symbol,direction,entry,stop,target,size,date)
      VALUES(${randomUUID()}::uuid,${owner}::uuid,${tradingAccountId}::uuid,-42.12,'QA-EURUSD','BUY',1.1,1.09,1.12,1,'2026-01-01')`;
    await db!
      .$executeRaw`INSERT INTO public.withdrawals(id,user_id,account_id,amount,status,date)
      VALUES(${randomUUID()}::uuid,${owner}::uuid,${tradingAccountId}::uuid,2000.12,'PAGADO','2026-01-02')`;
  });
  afterAll(async () => {
    if (!db) return;
    for (const userId of owners) {
      await db.$executeRaw`DELETE FROM public.accounts WHERE user_id=${userId}::uuid`;
      await db.$executeRaw`DELETE FROM public.trades WHERE user_id=${userId}::uuid`;
      await db.$executeRaw`DELETE FROM public.withdrawals WHERE user_id=${userId}::uuid`;
      await db.$executeRaw`DELETE FROM public.users WHERE id=${userId}::uuid`;
      await db.taxUploadLease.deleteMany({ where: { userId } });
    }
    await db.$disconnect();
  });
  async function identity() {
    const period = await db!.taxPeriod.findFirstOrThrow({
      where: { id: periodId, userId: owner },
    });
    return {
      requestId: randomUUID(),
      periodId,
      expectedRevision: period.revision,
    };
  }
  async function incomeInput(amount = "400000") {
    return {
      ...(await identity()),
      category: "SALARY",
      payer: "QA Employer",
      recognition: {
        recognitionDate: "2026-11-08",
        criterion: "QA documented annual salary receipt",
        legalBasis: "QA reviewed recognition basis",
        status: "REVIEWED" as const,
      },
      asset: hnl,
      grossAmount: amount,
      netAmount: amount,
      treatment: "ADMITTED" as const,
      treatmentReason: "QA salary evidence reconciled",
      legalReference: "QA declared salary legal criterion",
    };
  }
  async function evidence() {
    const result = await uploadEvidence(
      db!,
      owner,
      { ...(await identity()), name: "QA-salary.pdf", mime: "application/pdf" },
      pdf,
      storageFixture(),
    );
    return (result as { id: string }).id;
  }
  async function readyYear(options: { startPending?: boolean } = {}) {
    const initialInput = await incomeInput();
    let income = await saveIncome(
      db!,
      owner,
      options.startPending
        ? {
            ...initialInput,
            treatment: "PENDING",
            recognition: { ...initialInput.recognition, status: "PENDING" },
          }
        : initialInput,
    );
    const documentId = await evidence();
    await linkEvidence(db!, owner, {
      ...(await identity()),
      evidenceId: documentId,
      target: "income",
      targetId: income.id,
    });
    const receiptInput = {
      ...(await identity()),
      date: "2026-11-08",
      event: {
        type: "EXTERNAL_RECEIPT" as const,
        postings: [{ accountId, asset: hnl, quantity: "400000" }],
      },
    };
    const receipt = await saveTransaction(db!, owner, receiptInput);
    await postTransaction(db!, owner, {
      ...(await identity()),
      id: receipt.id,
      recordRevision: receipt.revision,
    });
    const posted = await db!.taxTransaction.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    await reconcile(db!, owner, {
      ...(await identity()),
      incomeId: income.id,
      incomeRevision: income.revision,
      transactionId: receipt.id,
      transactionRevision: posted.revision,
      receivedDate: "2026-11-08",
      receiptConfirmed: true,
      evidenceReference: "QA-salary.pdf",
      reason: "QA exact bank reconciliation",
      allocations: [{ grossAmount: "400000", netAmount: "400000" }],
    });
    if (options.startPending) {
      expect((await previewCalculation(db!, owner, { periodId })).status).toBe(
        "IN_REVIEW",
      );
      const priorLinks = await db!.taxReconciliation.findMany({
        where: { userId: owner, incomeId: income.id },
      });
      income = await saveIncome(db!, owner, {
        ...initialInput,
        ...(await identity()),
        id: income.id,
        recordRevision: income.revision,
        treatmentReason:
          "QA documented classification after receipt reconciliation",
      });
      expect(income.treatment).toBe("ADMITTED");
      expect(income.grossAmount).toBe("400000");
      expect(
        await db!.taxReconciliation.findMany({
          where: { userId: owner, incomeId: income.id },
        }),
      ).toEqual(priorLinks);
    }
    await updateInformation(db!, owner, {
      ...(await identity()),
      roundingConfirmed: true,
      information: {
        sectionB: {
          complete: true,
          nonTaxable: "0.00",
          nonDeductible: "0.00",
          relatedParties: "QA none",
        },
        roundingEvidenceId: documentId,
        roundingReason: "QA documented cent rounding",
        reviews: [],
      },
    });
    const preview = await previewCalculation(db!, owner, { periodId });
    expect(preview.pending).toEqual([]);
    expect(preview.status).toBe("READY");
    return { income, documentId, receipt };
  }
  async function tradingSnapshot() {
    return db!
      .$queryRaw`SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.accounts a WHERE a.user_id=${owner}::uuid),'trades',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.trades t WHERE t.user_id=${owner}::uuid),'withdrawals',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM public.withdrawals w WHERE w.user_id=${owner}::uuid)) AS snapshot`;
  }

  it("reconciles actual receipts, freezes a READY return, exports and reopens without changing the archived snapshot or trading rows", async () => {
    const before = await tradingSnapshot();
    await readyYear();
    const preview = await previewCalculation(db!, owner, { periodId });
    expect(preview.calculation?.tax).toBe("28343.65");
    expect((await balances(db!, owner))[0].quantity).toBe("400000");
    const prepared = await prepareReturn(db!, owner, await identity());
    expect(prepared.status).toBe("READY");
    expect(
      await db!.taxReturnEvidence.count({ where: { returnId: prepared.id } }),
    ).toBe(1);
    await closeReturn(db!, owner, {
      ...(await identity()),
      returnId: prepared.id,
    });
    expect((await getPeriod(db!, owner, { periodId })).status).toBe("CLOSED");
    await expect(
      saveIncome(db!, owner, await incomeInput("1")),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const exported = await exportReturn(db!, owner, prepared.id, "json");
    expect(JSON.parse(exported.body as string).snapshotHash).toBe(
      prepared.snapshotHash,
    );
    expect(JSON.parse(exported.body as string).snapshot.form.D.tax).toBe(
      "28343.65",
    );
    const csv = await exportReturn(db!, owner, prepared.id, "csv");
    expect(csv.body).toContain("28343.65");
    const old = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    const profile = await getProfile(db!, owner);
    await saveProfile(db!, owner, {
      requestId: randomUUID(),
      recordRevision: profile!.revision,
      name: "QA revised profile",
      rtn: "08011999000001",
      domiciled: true,
    });
    await reopenPeriod(db!, owner, {
      ...(await identity()),
      reason: "QA correction revision",
    });
    await refreshProfileSnapshot(db!, owner, {
      ...(await identity()),
      reason: "QA explicit open year refresh",
    });
    const newer = await prepareReturn(db!, owner, await identity());
    expect(newer.version).toBe(2);
    expect(newer.snapshotHash).not.toBe(old.snapshotHash);
    const archived = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    expect(archived.snapshot).toEqual(old.snapshot);
    expect(archived.snapshotHash).toBe(old.snapshotHash);
    expect(archived.closedAt).toEqual(old.closedAt);
    expect(await tradingSnapshot()).toEqual(before);
  }, 30_000);

  it("resolves a pending income after reconciliation while preserving its allocations and economic values", async () => {
    const before = await tradingSnapshot();
    const result = await readyYear({ startPending: true });
    expect(result.income.revision).toBe(2);
    const prepared = await prepareReturn(db!, owner, await identity());
    expect(prepared.status).toBe("READY");
    expect(
      (await previewCalculation(db!, owner, { periodId })).calculation?.tax,
    ).toBe("28343.65");
    expect(await tradingSnapshot()).toEqual(before);
  }, 30_000);

  it("uploads the SAR receipt after closing and reports filing without changing archived inputs or amounts", async () => {
    await readyYear();
    const prepared = await prepareReturn(db!, owner, await identity());
    await closeReturn(db!, owner, {
      ...(await identity()),
      returnId: prepared.id,
    });
    const archived = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    await expect(
      uploadEvidence(
        db!,
        owner,
        { ...(await identity()), name: "general.pdf", mime: "application/pdf" },
        pdf,
        storageFixture(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      uploadEvidence(
        db!,
        owner,
        {
          ...(await identity()),
          filingReturnId: randomUUID(),
          name: "wrong-return.pdf",
          mime: "application/pdf",
        },
        pdf,
        storageFixture(),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const receipt = await uploadEvidence(
      db!,
      owner,
      {
        ...(await identity()),
        filingReturnId: prepared.id,
        name: "SAR-filing-receipt.pdf",
        mime: "application/pdf",
      },
      pdf,
      storageFixture(),
    );
    const receiptId = (receipt as { id: string }).id;
    const filed = await reportFiled(db!, owner, {
      ...(await identity()),
      returnId: prepared.id,
      rtn: "08011999000001",
      filingReference: "QA-SAR-2026-102",
      receiptEvidenceId: receiptId,
      reportedFiledAt: "2027-04-01T15:00:00.000Z",
    });
    expect(filed.filingReference).toBe("QA-SAR-2026-102");
    expect(filed.reportedFiledAt).toBe("2027-04-01T15:00:00.000Z");
    const saved = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    expect(saved.snapshot).toEqual(archived.snapshot);
    expect(saved.snapshotHash).toBe(archived.snapshotHash);
    expect((archived.snapshot as { inputHash: string }).inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect((saved.snapshot as { inputHash: string }).inputHash).toBe((archived.snapshot as { inputHash: string }).inputHash);
    expect(saved.closedAt).toEqual(archived.closedAt);
    expect((await getPeriod(db!, owner, { periodId })).status).toBe("CLOSED");
    expect(
      await db!.taxReturnEvidence.count({
        where: { returnId: prepared.id, evidenceId: receiptId },
      }),
    ).toBe(1);
  }, 30_000);

  it("uses actual owner constraints and API predicates to reject cross-owner access and links", async () => {
    const income = await saveIncome(db!, owner, await incomeInput("1"));
    const other = randomUUID();
    owners.push(other);
    await createOwner(other);
    await saveProfile(db!, other, {
      requestId: randomUUID(),
      name: "Other QA",
      rtn: "08011999000099",
      domiciled: true,
    });
    const otherPeriod = await createPeriod(db!, other, {
      requestId: randomUUID(),
      year: 2026,
    });
    await expect(getPeriod(db!, other, { periodId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const doc = await evidence();
    await expect(
      linkEvidence(db!, other, {
        requestId: randomUUID(),
        periodId: otherPeriod.id,
        expectedRevision: otherPeriod.revision,
        evidenceId: doc,
        target: "income",
        targetId: income.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      db!.taxIncomeEvidence.create({
        data: { userId: other, evidenceId: doc, incomeId: income.id },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
    const ret = await prepareReturn(db!, owner, await identity());
    await expect(
      exportReturn(db!, other, ret.id, "json"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      await db!.taxIncomeEvidence.count({ where: { evidenceId: doc } }),
    ).toBe(0);
  }, 30_000);

  it("serializes competing postings, rejects stale retries and prevents a fresh retry from overdrawing the ledger", async () => {
    const receipt = await saveTransaction(db!, owner, {
      ...(await identity()),
      date: "2026-01-01",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: hnl, quantity: "100" }],
      },
    });
    await postTransaction(db!, owner, {
      ...(await identity()),
      id: receipt.id,
      recordRevision: receipt.revision,
    });
    const payments = [];
    for (let n = 0; n < 2; n++)
      payments.push(
        await saveTransaction(db!, owner, {
          ...(await identity()),
          date: "2026-01-02",
          event: {
            type: "PAYMENT",
            postings: [{ accountId, asset: hnl, quantity: "-80" }],
          },
        }),
      );
    const shared = await identity();
    const results = await Promise.allSettled(
      payments.map((p) =>
        postTransaction(db!, owner, {
          ...shared,
          requestId: randomUUID(),
          id: p.id,
          recordRevision: p.revision,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: { code: "CONFLICT" },
    });
    const draft = await db!.taxTransaction.findFirstOrThrow({
      where: { userId: owner, kind: "PAYMENT", status: "DRAFT" },
    });
    const fresh = await identity();
    await expect(
      postTransaction(db!, owner, {
        ...fresh,
        id: draft.id,
        recordRevision: draft.revision,
      }),
    ).rejects.toThrow("Insufficient recorded balance");
    expect((await identity()).expectedRevision).toBe(fresh.expectedRevision);
    expect(
      await db!.taxAuditEvent.count({
        where: { userId: owner, requestId: fresh.requestId },
      }),
    ).toBe(0);
    expect((await balances(db!, owner))[0].quantity).toBe("20");
  }, 30_000);

  it("edits draft postings and records an exact historical reversal with actual nested Prisma relations", async () => {
    const draft = await saveTransaction(db!, owner, {
      ...(await identity()),
      date: "2026-01-01",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: hnl, quantity: "1" }],
      },
    });
    const edited = await saveTransaction(db!, owner, {
      ...(await identity()),
      id: draft.id,
      recordRevision: draft.revision,
      date: "2026-01-01",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: hnl, quantity: "2" }],
      },
    });
    expect(edited.revision).toBe(draft.revision + 1);
    expect(edited.postings).toHaveLength(1);
    expect(edited.postings[0].userId).toBe(owner);
    expect(edited.postings[0].quantity).toBe("2");
    await postTransaction(db!, owner, {
      ...(await identity()),
      id: edited.id,
      recordRevision: edited.revision,
    });
    const posted = await db!.taxTransaction.findUniqueOrThrow({
      where: { id: edited.id },
    });
    const reverse = await reverseTransaction(db!, owner, {
      ...(await identity()),
      id: edited.id,
      recordRevision: posted.revision,
      date: "2026-01-02",
      reason: "QA exact reversal",
    });
    expect(reverse.reversalOfId).toBe(edited.id);
    expect(reverse.postings[0].userId).toBe(owner);
    expect(reverse.postings[0].quantity).toBe("-2");
    expect(
      (await db!.taxTransaction.findUniqueOrThrow({ where: { id: edited.id } }))
        .status,
    ).toBe("REVERSED");
    expect((await balances(db!, owner))[0].quantity).toBe("0");
  }, 30_000);

  it("reconciles and reverses the smallest supported token quantity without scientific-notation round-trip failures", async () => {
    const token = {
      kind: "TOKEN" as const,
      symbol: "BTC",
      network: "Bitcoin",
      contract: "native:BTC",
    };
    const tiny = "0.000000000000000001";
    const income = await saveIncome(db!, owner, {
      ...(await incomeInput(tiny)),
      asset: token,
      treatment: "PENDING",
    });
    const receipt = await saveTransaction(db!, owner, {
      ...(await identity()),
      date: "2026-11-08",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: token, quantity: tiny }],
      },
    });
    await postTransaction(db!, owner, {
      ...(await identity()),
      id: receipt.id,
      recordRevision: receipt.revision,
    });
    const posted = await db!.taxTransaction.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    const result = await reconcile(db!, owner, {
      ...(await identity()),
      incomeId: income.id,
      incomeRevision: income.revision,
      transactionId: receipt.id,
      transactionRevision: posted.revision,
      receivedDate: "2026-11-08",
      receiptConfirmed: true,
      evidenceReference: "QA token chain receipt",
      reason: "QA tiny quantity precision",
      allocations: [{ grossAmount: tiny, netAmount: tiny }],
    });
    expect(result.reconciliations[0].grossAmount).toBe(tiny);
    expect((await balances(db!, owner))[0].quantity).toBe(tiny);
    const reverse = await reverseTransaction(db!, owner, {
      ...(await identity()),
      id: receipt.id,
      recordRevision: posted.revision,
      date: "2026-11-09",
      reason: "QA exact tiny token reversal",
    });
    expect(reverse.postings[0].quantity).toBe("-0.000000000000000001");
    expect((await balances(db!, owner))[0].quantity).toBe("0");
  }, 30_000);

  it("rejects a posting valuation with the opposite sign through the actual SQL constraint", async () => {
    const draft = await saveTransaction(db!, owner, {
      ...(await identity()),
      date: "2026-01-01",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: hnl, quantity: "1" }],
      },
    });
    const posting = draft.postings[0];
    await expect(
      db!.taxPosting.update({
        where: { id: posting.id },
        data: { amountHnl: "-1.00" },
      }),
    ).rejects.toThrow("tax_postings_values_check");
    const saved = await db!.taxPosting.findUniqueOrThrow({
      where: { id: posting.id },
    });
    expect(saved.amountHnl!.toFixed(2)).toBe("1.00");
  }, 30_000);

  it("records next-year collection of a closed-year income without changing recognition, the archived return or trading", async () => {
    const before = await tradingSnapshot();
    const income = await saveIncome(db!, owner, await incomeInput("100"));
    const documentId = await evidence();
    await linkEvidence(db!, owner, {
      ...(await identity()),
      evidenceId: documentId,
      target: "income",
      targetId: income.id,
    });
    await updateInformation(db!, owner, {
      ...(await identity()),
      roundingConfirmed: true,
      information: {
        sectionB: {
          complete: true,
          nonTaxable: "0.00",
          nonDeductible: "0.00",
          relatedParties: "QA none",
        },
        roundingEvidenceId: documentId,
        roundingReason: "QA documented cent rounding",
        reviews: [],
      },
    });
    const prepared = await prepareReturn(db!, owner, await identity());
    expect(prepared.status).toBe("READY");
    await closeReturn(db!, owner, {
      ...(await identity()),
      returnId: prepared.id,
    });
    const archived = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    const oldPeriodId = periodId;
    const nextYear = await createPeriod(db!, owner, {
      requestId: randomUUID(),
      year: 2027,
    });
    periodId = nextYear.id;
    const receipt = await saveTransaction(db!, owner, {
      ...(await identity()),
      date: "2027-01-03",
      event: {
        type: "EXTERNAL_RECEIPT",
        postings: [{ accountId, asset: hnl, quantity: "100" }],
      },
    });
    await postTransaction(db!, owner, {
      ...(await identity()),
      id: receipt.id,
      recordRevision: receipt.revision,
    });
    const posted = await db!.taxTransaction.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    await reconcile(db!, owner, {
      ...(await identity()),
      incomeId: income.id,
      incomeRevision: income.revision,
      transactionId: receipt.id,
      transactionRevision: posted.revision,
      receivedDate: "2027-01-03",
      receiptConfirmed: true,
      evidenceReference: "QA delayed collection",
      reason: "QA recognition remains in 2026",
      allocations: [{ grossAmount: "100", netAmount: "100" }],
    });
    const oldIncome = await db!.taxIncome.findUniqueOrThrow({
      where: { id: income.id },
    });
    expect(oldIncome.periodId).toBe(oldPeriodId);
    expect(oldIncome.recognitionDate.toISOString().slice(0, 10)).toBe(
      "2026-11-08",
    );
    expect(oldIncome.revision).toBe(income.revision);
    expect(
      await db!.taxIncome.count({ where: { userId: owner, periodId } }),
    ).toBe(0);
    expect(
      (await db!.taxReturn.findUniqueOrThrow({ where: { id: archived.id } }))
        .snapshotHash,
    ).toBe(archived.snapshotHash);
    expect(
      (await db!.taxReturn.findUniqueOrThrow({ where: { id: archived.id } }))
        .snapshot,
    ).toEqual(archived.snapshot);
    const preview = await previewCalculation(db!, owner, { periodId });
    expect(preview.calculation).toBe(null);
    expect(preview.pending).toContain("RULES_UNAVAILABLE");
    expect(await tradingSnapshot()).toEqual(before);
  }, 30_000);

  it("lets one close-or-write operation win and preserves the opposing operation atomically", async () => {
    await readyYear();
    const prepared = await prepareReturn(db!, owner, await identity());
    const shared = await identity();
    const extra = {
      ...(await incomeInput("1")),
      ...shared,
      requestId: randomUUID(),
    };
    const [closed, written] = await Promise.allSettled([
      closeReturn(db!, owner, { ...shared, returnId: prepared.id }),
      saveIncome(db!, owner, extra),
    ]);
    expect(
      [closed, written].filter((r) => r.status === "fulfilled"),
    ).toHaveLength(1);
    const period = await getPeriod(db!, owner, { periodId });
    const old = await db!.taxReturn.findUniqueOrThrow({
      where: { id: prepared.id },
    });
    if (closed.status === "fulfilled") {
      expect(written).toMatchObject({
        status: "rejected",
        reason: { code: "CONFLICT" },
      });
      expect(period.status).toBe("CLOSED");
      expect(await db!.taxIncome.count({ where: { userId: owner } })).toBe(1);
      expect(old.closedAt).not.toBe(null);
    } else {
      expect(closed.reason).toMatchObject({ code: "CONFLICT" });
      expect(period.status).toBe("OPEN");
      expect(old.status).toBe("IN_REVIEW");
      expect(old.closedAt).toBe(null);
      expect(await db!.taxIncome.count({ where: { userId: owner } })).toBe(2);
    }
    expect(old.snapshotHash).toBe(prepared.snapshotHash);
  }, 30_000);
});
