"use client";
import { useState, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/app/dashboard/components/card";
import { useRecoverableDraft } from "@/hooks/useRecoverableDraft";
export type Fields = {
  [key: string]: string | boolean | number | Fields | (Fields | string)[];
};
export const labels: Record<string, string> = {
  name: "Nombre",
  rtn: "RTN (14 dígitos)",
  domiciled: "Domiciliado en Honduras",
  individualMerchant: "Comerciante individual",
  activity: "Actividad",
  address: "Dirección",
  obligations: "Obligaciones",
  declaredObligations: "Obligaciones declaradas (una por línea)",
  kind: "Tipo",
  owned: "Cuenta propia",
  archived: "Archivada",
  category: "Categoría (requiere revisión)",
  payer: "Pagador",
  description: "Descripción",
  recognition: "Reconocimiento fiscal",
  recognitionDate: "Fecha de reconocimiento",
  receivedDate: "Fecha de recepción",
  criterion: "Criterio de reconocimiento",
  status: "Estado",
  legalBasis: "Fundamento legal",
  asset: "Activo",
  code: "Código moneda",
  symbol: "Símbolo",
  network: "Red",
  contract: "Contrato del token",
  grossAmount: "Importe bruto",
  netAmount: "Importe neto",
  feeAmount: "Comisión",
  withheldAmount: "Retenido",
  treatment: "Tratamiento",
  treatmentReason: "Razón del tratamiento",
  legalReference: "Referencia legal",
  evidenceRequired: "Requiere evidencia",
  date: "Fecha",
  reference: "Referencia",
  event: "Movimiento",
  type: "Tipo de movimiento",
  postings: "Apuntes (cantidad firmada)",
  accountId: "Cuenta fiscal",
  quantity: "Cantidad",
  valuation: "Valoración HNL explícita",
  includeValuation: "Agregar o conservar valoración HNL",
  base: "Activo base",
  quote: "Moneda cotizada",
  rate: "Cotización",
  referenceAt: "Fecha y hora ISO de cotización",
  source: "Fuente",
  sourceUrl: "URL pública fuente",
  evidenceId: "Documento disponible",
  method: "Método",
  provider: "Proveedor",
  precision: "Precisión",
  reason: "Motivo",
  conversionRate: "Relación de conversión",
  amount: "Importe",
  admittedHnl: "Admitido HNL (revisión manual)",
  componentKey: "Identificador único del componente económico",
  amountHnl: "Importe HNL",
  previouslyAppliedHnl: "Ya aplicado HNL",
  sectionB: "Información sección B",
  complete: "Información completa confirmada",
  nonTaxable: "No gravable HNL",
  nonDeductible: "No deducible HNL",
  relatedParties: "Partes relacionadas (declaración explícita)",
  otherInformation: "Otra información",
  accountant: "Contador",
  registration: "Registro profesional",
  roundingConfirmed: "Confirmar redondeo documentado",
  roundingReason: "Fundamento del redondeo",
  roundingEvidenceId: "Evidencia del redondeo",
  priorFinancialEvidenceId: "Estados financieros previos",
  reviews: "Revisiones documentadas",
  recordId: "Registro revisado",
  mappingLabel: "Casilla formulario 102",
  relatedRecordIds: "Registros económicos relacionados",
  eligibilityConfirmed: "Elegibilidad revisada",
  capReviewed: "Tope revisado",
  incomeId: "Ingreso existente",
  incomeRevision: "Revisión del ingreso",
  transactionId: "Cobro existente",
  transactionRevision: "Revisión del cobro",
  receiptConfirmed: "Recepción confirmada",
  evidenceReference: "Referencia del comprobante",
  allocations: "Asignaciones parciales",
  sourceId: "Retiro propuesto",
  sourceHash: "Huella de la fuente",
  reviewedSourceHash: "Huella del origen revisado",
  sourceAmount: "Importe asignado de la fuente",
  filingReference: "Referencia de presentación",
  receiptEvidenceId: "Acuse disponible",
  reportedFiledAt: "Fecha y hora de presentación ISO",
  returnId: "Borrador 102",
  additionalIncomeHnl: "Ingreso adicional HNL",
  target: "Tipo de registro",
  targetId: "Registro vinculado",
  id: "Identificador",
  information: "Información y revisiones",
};
export const enumLabels: Record<string, string> = {
  PENDING: "Pendiente",
  REVIEWED: "Revisado por el usuario",
  ADMITTED: "Admitido por revisión manual",
  EXEMPT: "Exento según fundamento indicado",
  NOT_APPLICABLE: "No aplicable",
  BANK: "Banco",
  EXCHANGE: "Exchange",
  WALLET: "Wallet",
  CASH: "Efectivo",
  IN_TRANSIT: "En tránsito",
  FIAT: "Moneda fíat",
  TOKEN: "Token",
  OPEN: "Abierto",
  CLOSED: "Cerrado",
  DRAFT: "Borrador",
  POSTED: "Contabilizado",
  REVERSED: "Revertido",
  READY: "Listo",
  IN_REVIEW: "En revisión",
  EXPENSE: "Gasto",
  DEDUCTION: "Deducción",
  WITHHOLDING: "Retención",
  PREPAYMENT: "Anticipo",
  OTHER: "Otro",
  OPENING_BALANCE: "Saldo inicial",
  EXTERNAL_RECEIPT: "Recepción externa",
  OWN_TRANSFER: "Transferencia propia",
  CONVERSION: "Conversión",
  PAYMENT: "Pago",
  FEE: "Comisión",
  ADJUSTMENT: "Ajuste",
  REVERSAL: "Reverso",
  USER_DECLARED: "Declarada por el usuario",
  VERIFIED_SOURCE: "Fuente verificada por el usuario",
  AVAILABLE: "Disponible",
  UPLOADING: "Subiendo",
  NEW: "Propuesta nueva",
  UNCHANGED: "Origen sin cambios",
  MODIFIED: "Origen modificado",
  UNAVAILABLE: "Origen no disponible",
  income: "Ingreso",
  deduction: "Gasto o deducción",
  credit: "Crédito",
  transaction: "Movimiento",
  source: "Origen de retiro",
  reversal: "Revisión de reverso",
};
Object.assign(labels, {
  revision: "Revisión",
  createdAt: "Fecha de creación",
  updatedAt: "Última actualización",
  amountHnl: "Importe HNL",
  assetKind: "Tipo de activo",
  assetCode: "Código del activo",
  assetKey: "Identidad del activo",
  recognitionCriterion: "Criterio de reconocimiento",
  recognitionStatus: "Estado de reconocimiento",
  recognitionLegalBasis: "Fundamento del reconocimiento",
  periodId: "Ejercicio fiscal",
  incomeId: "Ingreso",
  transactionId: "Movimiento",
  reversalOfId: "Movimiento original revertido",
  sourceState: "Estado del origen",
  sourceHash: "Huella de la fuente",
  hash: "Huella",
  snapshot: "Copia conservada del origen",
  candidate: "Propuesta conservada",
  sourceType: "Tipo de fuente",
  account: "Cuenta de origen (solo lectura)",
  accountId: "Cuenta",
  currency: "Moneda",
  timezone: "Zona de calendario",
  profileSnapshot: "Perfil congelado del ejercicio",
  information: "Información del ejercicio",
  roundingConfirmed: "Redondeo confirmado",
  reconciliations: "Conciliaciones",
  evidenceLinks: "Vínculos documentales",
  evidenceIds: "Documentos",
  pending: "Pendientes",
  ruleVersion: "Versión de reglas",
  mappingVersion: "Versión del mapeo",
  inputHash: "Huella de entradas",
  manifest: "Manifiesto documental",
  size: "Tamaño en bytes",
  mime: "Tipo de archivo",
  sha256: "Huella SHA-256",
  reportedFiledAt: "Presentación declarada por el usuario",
  filingReference: "Referencia de presentación",
  receiptEvidenceId: "Acuse documental",
  balanceDue: "Saldo a pagar",
  excessCredit: "Exceso de crédito",
  tax: "ISR estimado",
  base: "Base",
  admittedIncome: "Ingreso admitido",
  credits: "Créditos",
  deductions: "Deducciones",
});
const options: Record<string, string[]> = {
  treatment: ["PENDING", "ADMITTED", "EXEMPT", "NOT_APPLICABLE"],
  type: [
    "OPENING_BALANCE",
    "EXTERNAL_RECEIPT",
    "OWN_TRANSFER",
    "CONVERSION",
    "PAYMENT",
    "FEE",
    "ADJUSTMENT",
  ],
  mappingLabel: [
    "No gravables",
    "Sueldos",
    "Otros ingresos gravables",
    "Honorarios",
    "Gastos",
    "Deducciones",
    "Retenciones salariales/art.50",
    "Pagos a cuenta",
    "Pagos del período",
    "Excedente anterior",
  ],
  target: ["income", "transaction", "deduction", "credit"],
};
export function formatMoney(value: string | null | undefined) {
  if (value == null) return "Sin calcular";
  const [whole, fraction] = value.split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction === undefined ? "" : "." + fraction)
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-4 min-w-0" id={title.replaceAll(" ", "-")}>
      <Card title={title}>{children}</Card>
    </section>
  );
}
function scrub(value: Fields): Fields {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "rtn")
      .map(([key, v]) => [
        key,
        Array.isArray(v)
          ? v.map((item) => (typeof item === "string" ? item : scrub(item)))
          : typeof v === "object"
            ? scrub(v)
            : v,
      ]),
  );
}
export function FieldEditor({
  value,
  onChange,
  prefix = "",
  choices = {},
}: {
  value: Fields;
  onChange: (value: Fields) => void;
  prefix?: string;
  choices?: Record<string, { value: string; label: string; fields?: Fields }[]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(value)
        .filter(
          ([key]) =>
            !["requestId", "expectedRevision", "periodId"].includes(key) && !(key === "valuation" && value.includeValuation === false),
        )
        .map(([key, v]) => {
          const label = labels[key] ?? key;
          const id = prefix + key;
          const set = (next: Fields[string]) => {
            if (key === "kind" && (v === "FIAT" || v === "TOKEN")) {
              onChange(
                next === "TOKEN"
                  ? { kind: "TOKEN", symbol: "", network: "", contract: "" }
                  : { kind: "FIAT", code: "" },
              );
              return;
            }
            const derived = choices[key]?.find(
              (option) => option.value === next,
            )?.fields;
            onChange({ ...value, ...derived, [key]: next });
          };
          if (key === "relatedRecordIds" && Array.isArray(v))
            return (
              <div key={key} className="text-xs space-y-1 sm:col-span-2">
                <label htmlFor={id}>{label}</label>
                <select
                  id={id}
                  multiple
                  aria-describedby={`${id}-help`}
                  className="w-full min-h-24 bg-[var(--panel-2)] border border-[var(--line)] rounded px-2"
                  value={v as string[]}
                  onChange={(e) =>
                    set(
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    )
                  }
                >
                  {(choices.relatedRecordIds ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p id={`${id}-help`} className="text-[var(--ink-3)]">
                  Vincula los ingresos, gastos o créditos que respaldan el
                  importe; no se crea renta automáticamente.
                </p>
              </div>
            );
          if (Array.isArray(v))
            return (
              <fieldset
                key={key}
                className="sm:col-span-2 border border-[var(--line)] rounded-lg p-3 space-y-3"
              >
                <legend>{label}</legend>
                {v.map((entry, index) => (
                  <div
                    key={index}
                    className="border-b border-[var(--line)] pb-3"
                  >
                    <FieldEditor
                      value={entry as Fields}
                      prefix={`${id}-${index}-`}
                      choices={choices}
                      onChange={(next) =>
                        set(v.map((old, i) => (i === index ? next : old)))
                      }
                    />
                    <Button
                      type="button"
                      disabled={v.length === 1}
                      onClick={() => set(v.filter((_, i) => i !== index))}
                    >
                      Quitar elemento
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() =>
                    set([
                      ...v,
                      structuredClone(
                        v[0] ??
                          (key === "reviews"
                            ? {
                                recordId: "",
                                kind: "income",
                                legalBasis: "",
                                reason: "",
                                evidenceId: "",
                                mappingLabel: "",
                                eligibilityConfirmed: false,
                                capReviewed: false,
                                method: "",
                                relatedRecordIds: [],
                              }
                            : {}),
                      ),
                    ])
                  }
                >
                  Añadir {label}
                </Button>
              </fieldset>
            );
          if (typeof v === "object")
            return (
              <fieldset
                className="sm:col-span-2 border border-[var(--line)] rounded-lg p-3"
                key={key}
              >
                <legend>{label}</legend>
                <FieldEditor
                  value={v}
                  prefix={id + "-"}
                  choices={choices}
                  onChange={set}
                />
              </fieldset>
            );
          if (typeof v === "boolean")
            return (
              <label className="flex items-center gap-2 text-sm" key={key}>
                <input
                  id={id}
                  type="checkbox"
                  checked={v}
                  onChange={(e) => set(e.target.checked)}
                />
                {label}
              </label>
            );
          const inferred =
            key === "status"
              ? String(v) === "USER_DECLARED" || String(v) === "VERIFIED_SOURCE"
                ? ["USER_DECLARED", "VERIFIED_SOURCE"]
                : ["PENDING", "REVIEWED"]
              : key === "kind" && ["FIAT", "TOKEN"].includes(String(v))
                ? ["FIAT", "TOKEN"]
                : undefined;
          const opts =
            inferred?.map((option) => ({ value: option, label: option })) ??
            choices[key] ??
            options[key]?.map((option) => ({ value: option, label: option }));
          return (
            <label className="text-xs space-y-1 min-w-0" key={key} htmlFor={id}>
              <span>{label}</span>
              {opts ? (
                <select
                  id={id}
                  className="w-full h-9 bg-[var(--panel-2)] border border-[var(--line)] rounded px-2"
                  value={String(v)}
                  onChange={(e) => set(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {opts.map((option) => (
                    <option key={option.value} value={option.value}>
                      {enumLabels[option.label] ?? option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  value={String(v)}
                  readOnly={
                    key === "sourceHash" ||
                    key === "reviewedSourceHash" ||
                    key === "incomeRevision" ||
                    key === "transactionRevision"
                  }
                  type={
                    key === "rtn"
                      ? "password"
                      : key === "date" || key.endsWith("Date")
                        ? "date"
                        : "text"
                  }
                  inputMode={
                    /Amount|Hnl|quantity|rate/.test(key) ? "decimal" : undefined
                  }
                  onChange={(e) =>
                    set(
                      typeof v === "number" ? +e.target.value : e.target.value,
                    )
                  }
                />
              )}
            </label>
          );
        })}
    </div>
  );
}
function restoreFields(initial: Fields, recovered: Fields): Fields {
  const result = { ...initial };
  for (const [key, value] of Object.entries(recovered)) {
    const base = initial[key];
    result[key] =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof base === "object" &&
      !Array.isArray(base)
        ? restoreFields(base, value)
        : value;
  }
  return result;
}
export function FiscalForm({
  title,
  userId,
  scope,
  initial,
  disabled = false,
  save,
  choices = {},
  children,
}: {
  title: string;
  userId: string;
  scope: string;
  initial: Fields;
  disabled?: boolean;
  save: (value: Fields) => Promise<unknown> | unknown;
  choices?: Record<string, { value: string; label: string; fields?: Fields }[]>;
  children?: ReactNode;
}) {
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  const [value, setValue] = useState(initial),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const draft = useRecoverableDraft(userId, "fiscal:" + scope, (v) =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Fields) : null,
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled || pending || !draft.ready) return;
        setPending(true);
        setMessage("");
        const token = draft.snapshot();
        try {
          const payload = JSON.stringify(value);
          if (attempt.current?.payload !== payload)
            attempt.current = { payload, requestId: crypto.randomUUID() };
          const saved = await save({
            ...value,
            requestId: attempt.current.requestId,
          });
          if (saved === false) {
            setMessage("Operación cancelada. Conservamos tus entradas.");
            return;
          }
          draft.clearSaved(token);
          setMessage("Guardado. Datos actualizados.");
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo guardar. Conservamos tus entradas; actualiza y reintenta.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      {draft.recovery && (
        <div role="status" className="p-3 bg-[var(--chip)] rounded">
          Hay un borrador local de este formulario.{" "}
          <Button
            type="button"
            onClick={() => {
              setValue(restoreFields(initial, draft.recovery!.value));
              draft.dismiss();
            }}
          >
            Recuperar borrador
          </Button>{" "}
          <Button type="button" onClick={draft.discard}>
            Descartar borrador
          </Button>
        </div>
      )}
      <fieldset disabled={disabled || pending} className="space-y-4">
        <legend className="font-medium mb-3">{title}</legend>
        <FieldEditor
          value={value}
          onChange={(next) => {
            setValue(next);
            draft.store(scrub(next));
          }}
          choices={choices}
          prefix={scope + ":"}
        />
        {children}
        <Button
          variant="primary"
          type="submit"
          disabled={disabled || pending || !draft.ready}
          loading={pending}
        >
          Guardar {title}
        </Button>
      </fieldset>
      {message && (
        <p role="status" className="text-sm break-words">
          {message}
        </p>
      )}
    </form>
  );
}
