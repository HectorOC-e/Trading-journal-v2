"use client";
import { FiscalForm, type Fields } from "./fiscal-form";
import { clean, valuation } from "./templates";
export type RecordKind = "income" | "deduction" | "credit" | "transaction";
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function asset(row: Record<string, unknown>): Fields {
  return row.assetKind === "TOKEN"
    ? {
        kind: "TOKEN",
        symbol: text(row.assetCode),
        network: text(row.network),
        contract: text(row.contract),
      }
    : { kind: "FIAT", code: text(row.assetCode) };
}
function fields(value: unknown): Fields | null {
  const row = object(value);
  const result: Fields = {};
  for (const [key, v] of Object.entries(row)) {
    if (
      typeof v === "string" ||
      typeof v === "boolean" ||
      typeof v === "number"
    )
      result[key] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = fields(v);
      if (nested) result[key] = nested;
    }
  }
  return result;
}
export function editableRecord(value: unknown, kind: RecordKind): Fields {
  const row = object(value);
  const keys =
    kind === "income"
      ? [
          "category",
          "payer",
          "description",
          "grossAmount",
          "netAmount",
          "feeAmount",
          "withheldAmount",
          "treatment",
          "treatmentReason",
          "legalReference",
          "evidenceRequired",
        ]
      : kind === "deduction"
        ? [
            "kind",
            "category",
            "description",
            "date",
            "amount",
            "admittedHnl",
            "componentKey",
            "treatment",
            "treatmentReason",
            "legalReference",
          ]
        : kind === "credit"
          ? [
              "kind",
              "payer",
              "date",
              "reference",
              "amountHnl",
              "previouslyAppliedHnl",
              "admittedHnl",
              "componentKey",
              "treatment",
              "treatmentReason",
              "legalReference",
            ]
          : ["date", "description", "reference"];
  const result: Fields = {};
  for (const key of keys)
    if (typeof row[key] === "string" || typeof row[key] === "boolean")
      result[key] = row[key];
  if (kind === "income")
    result.recognition = {
      recognitionDate: text(row.recognitionDate),
      criterion: text(row.recognitionCriterion),
      status: text(row.recognitionStatus),
      legalBasis: text(row.recognitionLegalBasis),
    };
  if (kind === "deduction" || kind === "credit") result.admittedHnl = text(row.admittedHnl);
  if (kind === "income" || kind === "deduction") {
    result.asset = asset(row);
    result.includeValuation = Boolean(row.valuation);
    result.valuation = row.valuation ? fields(row.valuation) ?? {} : { ...valuation, base: asset(row), quantity: text(kind === "income" ? row.grossAmount : row.amount) };
  }
  if (kind === "transaction")
    result.event = {
      type: text(row.kind),
      reason: text(row.description),
      conversionRate: "",
      postings: (Array.isArray(row.postings) ? row.postings : []).map((p) => {
        const posting = object(p);
        return {
          accountId: text(posting.accountId),
          asset: asset(posting),
          quantity: text(posting.quantity),
          ...(posting.valuation
            ? { valuation: fields(posting.valuation) ?? {} }
            : {}),
        };
      }),
    };
  return result;
}
export function RecordEditor({
  record,
  kind,
  userId,
  periodId,
  disabled,
  save,
  choices,
}: {
  record: unknown;
  kind: RecordKind;
  userId: string;
  periodId: string;
  disabled: boolean;
  save: (value: Fields) => Promise<unknown>;
  choices: Record<string, { value: string; label: string }[]>;
}) {
  const row = object(record);
  if (typeof row.id !== "string" || typeof row.revision !== "number")
    return null;
  const title =
    kind === "income"
      ? "ingreso existente"
      : kind === "deduction"
        ? "gasto existente"
        : kind === "credit"
          ? "crédito existente"
          : "borrador de movimiento";
  return (
    <details
      id={kind === "transaction" ? undefined : row.id}
      className="my-3 border-t border-[var(--line)] pt-3"
    >
      <summary>
        Editar {title} · {row.id}
      </summary>
      <p className="text-xs my-2">
        Los registros conciliados o con componentes aplicados requieren
        corrección documentada; el servidor conserva esas restricciones.
      </p>
      <FiscalForm
        key={`${row.id}:${row.revision}`}
        title={title}
        userId={userId}
        scope={`${periodId}:${kind}:${row.id}:revision:${row.revision}`}
        initial={editableRecord(row, kind)}
        disabled={disabled}
        choices={choices}
        save={(value) =>
          save({
            ...(clean(value) as Fields),
            id: row.id as string,
            recordRevision: row.revision as number,
          })
        }
      />
    </details>
  );
}
