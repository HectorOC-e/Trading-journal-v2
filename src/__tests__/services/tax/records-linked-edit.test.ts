import { describe, expect, it } from "vitest";
import { Prisma } from "@/lib/generated/prisma/client";
import { saveIncome } from "@/server/services/tax/record-service";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = id(1),
  periodId = id(2),
  incomeId = id(3),
  evidenceId = id(4);
const D = (n: string) => new Prisma.Decimal(n);
function fixture() {
  const state: any = {
    period: { id: periodId, userId, year: 2026, status: "OPEN", revision: 1 },
    income: {
      id: incomeId,
      userId,
      periodId,
      revision: 2,
      category: "PROP_FIRM",
      payer: "FTMO",
      description: "Pago",
      recognitionDate: new Date("2026-06-01"),
      recognitionCriterion: "Por revisar",
      recognitionStatus: "PENDING",
      recognitionLegalBasis: "",
      assetKey: "FIAT:USD",
      assetKind: "FIAT",
      assetCode: "USD",
      network: "",
      contract: "",
      grossAmount: D("100"),
      netAmount: D("90"),
      feeAmount: D("5"),
      withheldAmount: D("5"),
      amountHnl: null,
      valuation: null,
      treatment: "PENDING",
      reconciliations: [
        { id: id(5), grossAmount: D("100"), netAmount: D("90") },
      ],
    },
    fee: null,
    withheld: null,
    evidence: { id: evidenceId, userId, periodId, status: "AVAILABLE" },
    audits: [],
    updates: 0,
  };
  const match = (row: any, where: any) =>
    row && Object.entries(where).every(([key, value]) => row[key] === value);
  const tx: any = {
    $queryRaw: async () => [],
    accountDeletionJob: { findUnique: async () => null },
    taxAuditEvent: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        state.audits.push(data);
        return data;
      },
    },
    taxPeriod: {
      findMany: async ({ where }: any) =>
        where.userId === userId && where.id.in.includes(periodId)
          ? [{ ...state.period }]
          : [],
      findFirst: async ({ where }: any) =>
        match(state.period, where) ? state.period : null,
      updateMany: async () => {
        state.period.revision++;
        return { count: 1 };
      },
    },
    taxReturn: { updateMany: async () => ({ count: 0 }) },
    taxIncome: {
      findFirst: async ({ where }: any) =>
        match(state.income, where) ? state.income : null,
      update: async ({ data }: any) => {
        state.updates++;
        Object.assign(state.income, {
          ...data,
          revision: state.income.revision + data.revision.increment,
        });
        return state.income;
      },
    },
    taxDeduction: { findFirst: async () => state.fee },
    taxCredit: { findFirst: async () => state.withheld },
    taxEvidence: {
      findFirst: async ({ where }: any) =>
        match(state.evidence, where) ? state.evidence : null,
    },
  };
  const input = {
    requestId: id(10),
    periodId,
    expectedRevision: 1,
    id: incomeId,
    recordRevision: 2,
    category: "HONORARIOS",
    payer: "FTMO",
    description: "Tratamiento confirmado documentalmente",
    recognition: {
      recognitionDate: "2026-06-01",
      criterion: "Percibido",
      status: "REVIEWED" as const,
      legalBasis: "Criterio profesional documentado",
    },
    asset: { kind: "FIAT" as const, code: "USD" },
    grossAmount: "100",
    netAmount: "90",
    feeAmount: "5",
    withheldAmount: "5",
    treatment: "ADMITTED" as const,
    treatmentReason: "Clasificación revisada con el contador",
    legalReference: "Fundamento aportado",
    evidenceRequired: true,
  };
  return {
    state,
    input,
    db: { $transaction: async (fn: any) => fn(tx) } as any,
  };
}
const valuation = {
  quantity: "100",
  base: { kind: "FIAT" as const, code: "USD" },
  quote: { kind: "FIAT" as const, code: "HNL" },
  rate: "25",
  referenceAt: "2026-06-01T00:00:00Z",
  source: "Constancia bancaria",
  method: "Cambio efectivo",
  provider: "Banco",
  precision: 2,
  status: "USER_DECLARED" as const,
  evidenceId,
};
describe("documented corrections to linked fiscal income", () => {
  it("classifies a received pending payout while preserving its quantities and reconciliations", async () => {
    const f = fixture();
    const allocations = JSON.stringify(f.state.income.reconciliations);
    const result = await saveIncome(f.db, userId, f.input);
    expect(result.treatment).toBe("ADMITTED");
    expect(result.recognitionLegalBasis).toBe(f.input.recognition.legalBasis);
    expect(result.grossAmount).toBe("100");
    expect(result.netAmount).toBe("90");
    expect(result.revision).toBe(3);
    expect(JSON.stringify(f.state.income.reconciliations)).toBe(allocations);
    expect(f.state.audits).toHaveLength(1);
  });
  it("completes an unknown valuation from an available owned document", async () => {
    const f = fixture();
    const result = await saveIncome(f.db, userId, { ...f.input, valuation });
    expect(result.amountHnl).toBe("2500.00");
    expect(result.valuation).toMatchObject({ evidenceId });
  });
  it("allows classification with linked fee and withholding within the new supported caps", async () => {
    const f = fixture();
    f.state.fee = { amountHnl: D("125"), amount: D("5") };
    f.state.withheld = { amountHnl: D("125") };
    expect(
      (await saveIncome(f.db, userId, { ...f.input, valuation })).amountHnl,
    ).toBe("2500.00");
    expect(f.state.fee.amountHnl.toFixed()).toBe("125");
    expect(f.state.withheld.amountHnl.toFixed()).toBe("125");
  });
  it("permits a documented correction when only a reserved component is linked", async () => {
    const f = fixture();
    f.state.income.reconciliations = [];
    f.state.fee = { amountHnl: null, amount: D("5") };
    expect((await saveIncome(f.db, userId, f.input)).treatment).toBe(
      "ADMITTED",
    );
  });
  it.each(["grossAmount", "netAmount", "feeAmount", "withheldAmount"])(
    "rejects a nominal %s change even when gross still balances",
    async (field) => {
      const f = fixture();
      const changed: any = {
        ...f.input,
        grossAmount: "110",
        netAmount: "99",
        feeAmount: "6",
        withheldAmount: "5",
      };
      if (field === "withheldAmount")
        Object.assign(changed, {
          grossAmount: "110",
          netAmount: "99",
          feeAmount: "5",
          withheldAmount: "6",
        });
      await expect(saveIncome(f.db, userId, changed)).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(f.state.updates).toBe(0);
    },
  );
  it("rejects changing the recognition date or asset of a linked receipt", async () => {
    const f = fixture();
    await expect(
      saveIncome(f.db, userId, {
        ...f.input,
        recognition: { ...f.input.recognition, recognitionDate: "2026-06-02" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const g = fixture();
    await expect(
      saveIncome(g.db, userId, {
        ...g.input,
        asset: { kind: "FIAT", code: "EUR" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("requires a correction reason even when keeping treatment pending", async () => {
    const f = fixture();
    await expect(
      saveIncome(f.db, userId, {
        ...f.input,
        treatment: "PENDING",
        treatmentReason: "  ",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(f.state.updates).toBe(0);
  });
  it("requires available own evidence for a new valuation", async () => {
    const f = fixture();
    await expect(
      saveIncome(f.db, userId, {
        ...f.input,
        valuation: { ...valuation, evidenceId: undefined },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const g = fixture();
    g.state.evidence.userId = id(99);
    await expect(
      saveIncome(g.db, userId, { ...g.input, valuation }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it.each(["fee", "withheld"])(
    "rejects reducing valuation below an existing %s HNL component",
    async (kind) => {
      const f = fixture();
      f.state.income.amountHnl = D("3000");
      f.state.income.valuation = { ...valuation, rate: "30" };
      f.state[kind] = { amountHnl: D("126"), amount: D("5") };
      await expect(
        saveIncome(f.db, userId, { ...f.input, valuation }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(f.state.updates).toBe(0);
    },
  );
  it("keeps valued linked components from losing their income HNL support", async () => {
    const f = fixture();
    f.state.fee = { amountHnl: D("125"), amount: D("5") };
    await expect(saveIncome(f.db, userId, f.input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
  it("allows classification of fixed HNL income without inventing an exchange-rate requirement", async () => {
    const f = fixture();
    Object.assign(f.state.income, {
      assetKey: "FIAT:HNL",
      assetCode: "HNL",
      amountHnl: D("100"),
    });
    const result = await saveIncome(f.db, userId, {
      ...f.input,
      asset: { kind: "FIAT", code: "HNL" },
    });
    expect(result.amountHnl).toBe("100.00");
    expect(result.treatment).toBe("ADMITTED");
  });
  it("accepts equivalent decimal representations without changing linked economic amounts", async () => {
    const f = fixture();
    const result = await saveIncome(f.db, userId, {
      ...f.input,
      grossAmount: "100.00",
      netAmount: "90.0",
      feeAmount: "5.000",
      withheldAmount: "5.00",
    });
    expect(result.treatment).toBe("ADMITTED");
    expect(f.state.updates).toBe(1);
  });
  it("does not silently remove an existing documented valuation during classification", async () => {
    const f = fixture();
    f.state.income.amountHnl = D("2500");
    f.state.income.valuation = valuation;
    await expect(saveIncome(f.db, userId, f.input)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(f.state.updates).toBe(0);
  });
  it("rejects stale revisions, closed periods and foreign ownership", async () => {
    const f = fixture();
    await expect(
      saveIncome(f.db, userId, { ...f.input, recordRevision: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const g = fixture();
    g.state.period.status = "CLOSED";
    await expect(saveIncome(g.db, userId, g.input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const h = fixture();
    h.state.income.userId = id(99);
    await expect(saveIncome(h.db, userId, h.input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
