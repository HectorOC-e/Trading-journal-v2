import type { Fields } from "./fiscal-form";
export function fiscalDate(year: number, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return part("year") === String(year)
    ? `${part("year")}-${part("month")}-${part("day")}`
    : `${year}-01-01`;
}
export const asset = { kind: "FIAT", code: "HNL" };
export const token = {
  kind: "TOKEN",
  symbol: "USDC",
  network: "",
  contract: "",
};
export const valuation = {
  quantity: "0",
  base: asset,
  quote: { kind: "FIAT", code: "HNL" },
  rate: "",
  referenceAt: "",
  source: "",
  method: "",
  provider: "",
  precision: 18,
  status: "USER_DECLARED",
  evidenceId: "",
};
export function income(
  year: number,
  tokenAsset = false,
  valued = false,
): Fields {
  return {
    category: "",
    payer: "",
    description: "",
    recognition: {
      recognitionDate: fiscalDate(year),
      criterion: "",
      status: "PENDING",
      receivedDate: "",
      legalBasis: "",
    },
    asset: tokenAsset ? token : asset,
    ...(valued
      ? { valuation: { ...valuation, base: tokenAsset ? token : asset } }
      : {}),
    grossAmount: "0",
    netAmount: "0",
    feeAmount: "0",
    withheldAmount: "0",
    treatment: "PENDING",
    treatmentReason: "",
    legalReference: "",
    evidenceRequired: true,
  };
}
export function transaction(
  year: number,
  tokenAsset = false,
  valued = false,
): Fields {
  return {
    date: fiscalDate(year),
    description: "",
    reference: "",
    event: {
      type: "EXTERNAL_RECEIPT",
      reason: "",
      conversionRate: "",
      postings: [
        {
          accountId: "",
          asset: tokenAsset ? token : asset,
          quantity: "0",
          ...(valued
            ? { valuation: { ...valuation, base: tokenAsset ? token : asset } }
            : {}),
        },
      ],
    },
  };
}
export const review = {
  recordId: "",
  kind: "income",
  legalBasis: "",
  reason: "",
  evidenceId: "",
  mappingLabel: "",
  eligibilityConfirmed: false,
  capReviewed: false,
  method: "",
  relatedRecordIds: [] as string[],
  reviewedSourceHash: "",
};
export const information: Fields = {
  roundingConfirmed: false,
  information: {
    sectionB: {
      complete: false,
      nonTaxable: "",
      nonDeductible: "",
      relatedParties: "",
      otherInformation: "",
    },
    accountant: { name: "", rtn: "", registration: "" },
    priorFinancialEvidenceId: "",
    roundingEvidenceId: "",
    roundingReason: "",
    reviews: [review],
  },
};
/** Empty optional values are omitted, never converted into a zero or FX assumption. */
export function clean(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .filter(
        (v) => !(v && typeof v === "object" && "recordId" in v && !v.recordId),
      )
      .map(clean);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "includeValuation" && (key !== "valuation" || !("includeValuation" in value) || value.includeValuation === true))
        .filter(
          ([key, v]) =>
            key !== "accountant" || Object.values(v as object).some(Boolean),
        )
        .filter(
          ([key, v]) =>
            v !== "" ||
            [
              "name",
              "rtn",
              "description",
              "reference",
              "activity",
              "address",
              "payer",
            ].includes(key),
        )
        .map(([key, v]) => [key, clean(v)]),
    );
  return value;
}
