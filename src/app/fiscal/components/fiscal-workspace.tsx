"use client";
import { useFiscalConfirmation } from "./confirmation";
import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  FiscalForm,
  Panel,
  formatMoney,
  labels,
  enumLabels,
  type Fields,
} from "./fiscal-form";
import {
  clean,
  income,
  transaction,
  information,
  review,
  asset,
  fiscalDate,
  valuation,
  token,
} from "./templates";
import { RecordEditor } from "./record-editor";
import { EvidencePanel } from "./evidence-panel";
const RecordNavigation = createContext<{
  go: (key: string, id: string) => void;
  can: (key: string, id: string) => boolean;
} | null>(null);
type Tax = inferRouterInputs<AppRouter>["tax"];
export function FiscalWorkspace() {
  const identity = trpc.profile.get.useQuery();
  const profile = trpc.tax.profile.get.useQuery();
  const periods = trpc.tax.periods.list.useQuery({ limit: 100 });
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Resumen");
  const utils = useQueryClient();
  const profileSave = trpc.tax.profile.save.useMutation();
  const create = trpc.tax.periods.create.useMutation();
  const refresh = async () => {
    await utils.invalidateQueries({
      predicate: (query) => JSON.stringify(query.queryKey[0]).includes("tax"),
    });
  };
  if (identity.isPending || profile.isPending || periods.isPending)
    return (
      <p role="status" className="p-6">
        Cargando perfil y ejercicios fiscales…
      </p>
    );
  if (identity.error || profile.error || periods.error)
    return (
      <div role="alert" className="p-6">
        <p>No pudimos cargar tus datos fiscales.</p>
        <Button
          onClick={() => {
            void identity.refetch();
            void profile.refetch();
            void periods.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  if (!identity.data?.id)
    return <p role="alert">No se pudo resolver la identidad autenticada.</p>;
  const userId = identity.data.id;
  const periodRows = periods.data?.items;
  const current = periodRows?.find((p) => p.id === selected) ?? periodRows?.[0];
  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 text-[var(--ink)]">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
          Honduras · Persona natural domiciliada
        </p>
        <h1 className="text-2xl font-semibold">Fiscalidad</h1>
        <p className="text-sm text-[var(--ink-3)]">
          Registros independientes · HNL · America/Tegucigalpa. Borrador / no
          presentado. Sin validación oficial SAR.
        </p>
      </header>
      <Panel title="Perfil fiscal">
        <FiscalForm
          key={`${profile.data?.id ?? "new"}:${profile.data?.revision ?? 0}`}
          title="perfil fiscal"
          userId={userId}
          scope={`profile:revision:${profile.data?.revision ?? 0}`}
          initial={{
            name: profile.data?.name ?? "",
            rtn: profile.data?.rtn ?? "",
            domiciled: true,
            individualMerchant: profile.data?.individualMerchant ?? false,
            activity: profile.data?.activity ?? "",
            address: profile.data?.address ?? "",
            declaredObligations: (profile.data?.obligations ?? []).join("\n"),
          }}
          save={async (values) => {
            const { declaredObligations, ...fields } = values;
            await profileSave.mutateAsync({
              ...fields,
              obligations: String(declaredObligations)
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
              requestId: String(values.requestId),
              recordRevision: profile.data?.revision,
            } as Tax["profile"]["save"]);
            await refresh();
          }}
        />
      </Panel>
      {profile.data && (
        <>
          <Panel title="Ejercicio">
            <label className="block text-sm">
              Ejercicio fiscal{" "}
              <select
                className="m-2 p-2 bg-[var(--panel-2)] rounded"
                value={current?.id ?? ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {periodRows?.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.year} · {period.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {[2026, 2027]
                .filter((year) => !periodRows?.some((p) => p.year === year))
                .map((year) => (
                  <Button
                    key={year}
                    loading={create.isPending}
                    onClick={async () => {
                      try {
                        const p = await create.mutateAsync({
                          requestId: crypto.randomUUID(),
                          year,
                        });
                        await refresh();
                        setSelected(p.id);
                      } catch {
                        /* mutation error below */
                      }
                    }}
                  >
                    Abrir ejercicio {year}
                  </Button>
                ))}
            </div>
            {create.error && <p role="alert">{create.error.message}</p>}
            <p className="text-xs mt-2">
              2027 permite registrar datos; las reglas ISR 2027 no están
              disponibles.
            </p>
          </Panel>
          {current && (
            <>
              <nav
                aria-label="Secciones fiscales"
                className="flex gap-2 overflow-x-auto pb-2"
              >
                {[
                  "Resumen",
                  "Cuentas",
                  "Ingresos",
                  "Movimientos",
                  "Retiros",
                  "Gastos y créditos",
                  "Documentos",
                  "ISR y declaración",
                ].map((name) => (
                  <Button
                    key={name}
                    className="shrink-0"
                    variant={tab === name ? "primary" : "ghost"}
                    aria-pressed={tab === name}
                    onClick={() => setTab(name)}
                  >
                    {name}
                  </Button>
                ))}
              </nav>
              <PeriodWorkspace
                key={userId + current.id}
                userId={userId}
                periodId={current.id}
                tab={tab}
                onTabChange={setTab}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
function PeriodWorkspace({
  userId,
  periodId,
  tab,
  onTabChange,
}: {
  userId: string;
  periodId: string;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { confirm, dialog } = useFiscalConfirmation();
  const [cursors, setCursors] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedRecord, setSelectedRecord] = useState("");
  useEffect(() => {
    if (selectedRecord)
      document
        .getElementById(selectedRecord)
        ?.scrollIntoView?.({ block: "center" });
  }, [tab, selectedRecord]);
  const utils = useQueryClient();
  const [recognitionPeriod, setRecognitionPeriod] = useState(periodId);
  const fiscalPeriods = trpc.tax.periods.list.useQuery({ limit: 100 });
  const recognitionIncomes = trpc.tax.incomes.list.useQuery({
    periodId: recognitionPeriod,
    limit: 100,
    cursor: cursors.recognitionIncomes,
  });
  const evidence = useQuery({
    queryKey: ["tax-evidence", periodId],
    queryFn: async () => {
      const items: { id: string; name: string; status: string }[] = [];
      let cursor: string | null = null;
      do {
        const response = await fetch(
          `/api/tax/evidence?periodId=${periodId}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("No se pudo cargar evidencia");
        const page = (await response.json()) as {
          items: { id: string; name: string; status: string }[];
          nextCursor: string | null;
        };
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return { items };
    },
  });
  const period = trpc.tax.periods.get.useQuery({ periodId });
  const overview = trpc.tax.overview.useQuery({ periodId });
  const accounts = trpc.tax.accounts.list.useQuery({
    limit: 100,
    cursor: cursors.accounts,
  });
  const incomes = trpc.tax.incomes.list.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.incomes,
  });
  const transactions = trpc.tax.transactions.list.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.transactions,
  });
  const deductions = trpc.tax.deductions.list.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.deductions,
  });
  const credits = trpc.tax.credits.list.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.credits,
  });
  const candidates = trpc.tax.imports.candidates.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.imports,
    savedCursor: cursors.saved,
  });
  const preview = trpc.tax.calculations.preview.useQuery({ periodId });
  const returns = trpc.tax.returns.list.useQuery({
    periodId,
    limit: 100,
    cursor: cursors.returns,
  });
  const refreshProfile = trpc.tax.periods.refreshProfile.useMutation();
  const accountSave = trpc.tax.accounts.save.useMutation();
  const incomeSave = trpc.tax.incomes.save.useMutation();
  const transactionSave = trpc.tax.transactions.save.useMutation();
  const post = trpc.tax.transactions.post.useMutation();
  const discard = trpc.tax.transactions.discard.useMutation();
  const reverse = trpc.tax.transactions.reverse.useMutation();
  const deductionSave = trpc.tax.deductions.save.useMutation();
  const creditSave = trpc.tax.credits.save.useMutation();
  const reconcile = trpc.tax.imports.reconcile.useMutation();
  const dismiss = trpc.tax.imports.dismiss.useMutation();
  const infoSave = trpc.tax.periods.updateInformation.useMutation();
  const prepare = trpc.tax.returns.prepare.useMutation();
  const close = trpc.tax.returns.close.useMutation();
  const reopen = trpc.tax.returns.reopen.useMutation();
  const filed = trpc.tax.returns.reportFiled.useMutation();
  const [tokenAsset, setTokenAsset] = useState(false),
    [valued, setValued] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [simulation, setSimulation] = useState<string | undefined>();
  const sim = trpc.tax.calculations.preview.useQuery(
    { periodId, simulation: { additionalIncomeHnl: simulation ?? "0.00" } },
    { enabled: simulation !== undefined },
  );
  const refresh = async () => {
    await utils.invalidateQueries({
      predicate: (query) => JSON.stringify(query.queryKey[0]).includes("tax"),
    });
    await period.refetch();
  };
  const write = (requestId?: unknown) => ({
    requestId: typeof requestId === "string" ? requestId : crypto.randomUUID(),
    periodId,
    expectedRevision: period.data!.revision,
  });
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
      setMessage("Operación completada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Operación fallida. Reintenta.",
      );
    } finally {
      setBusy(false);
    }
  };
  const queries: {
    isPending: boolean;
    error: { message: string } | null;
    refetch: () => Promise<unknown>;
  }[] = [
    period,
    overview,
    accounts,
    incomes,
    transactions,
    deductions,
    credits,
    candidates,
    preview,
    returns,
  ];
  if (period.isPending) return <p role="status">Cargando ejercicio…</p>;
  if (period.error)
    return (
      <p role="alert">
        {period.error.message}{" "}
        <Button onClick={() => void period.refetch()}>Reintentar</Button>
      </p>
    );
  if (!period.data) return null;
  const closed = period.data.status === "CLOSED";
  const mutationPending =
    busy ||
    [
      accountSave,
      incomeSave,
      transactionSave,
      post,
      discard,
      reverse,
      deductionSave,
      creditSave,
      reconcile,
      dismiss,
      infoSave,
      prepare,
      close,
      reopen,
      filed,
      refreshProfile,
    ].some((m) => m.isPending);
  const disabled = closed || mutationPending;
  const archivedReturns = (returns.data?.items ?? []).filter((item) => Boolean(item.closedAt));
  const fileableReturns = archivedReturns.filter((item) => !item.reportedFiledAt);
  const year = period.data.year;
  const accountRows = accounts.data?.items ?? [];
  const transactionRows = transactions.data?.items ?? [];
  const availableEvidence = (evidence.data?.items ?? [])
    .filter((e) => e.status === "AVAILABLE")
    .map((e) => ({ value: e.id, label: e.name }));
  const economicChoices = [
    ...(incomes.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `Ingreso · ${row.payer} · ${row.grossAmount}`,
      fields: { kind: "income" },
    })),
    ...(deductions.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `Gasto · ${row.category} · ${row.amount}`,
      fields: { kind: "deduction" },
    })),
    ...(credits.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `Crédito · ${row.payer} · ${row.amountHnl}`,
      fields: { kind: "credit" },
    })),
  ];
  const choices = {
    relatedRecordIds: economicChoices,
    recordId: [
      ...economicChoices,
      ...transactionRows.map((row) => ({
        value: row.id,
        label: `Movimiento · ${row.kind} · ${row.date}`,
        fields: { kind: "transaction" },
      })),
    ],
    evidenceId: availableEvidence,
    roundingEvidenceId: availableEvidence,
    priorFinancialEvidenceId: availableEvidence,
    receiptEvidenceId: availableEvidence,
    accountId: accountRows.map((a) => ({
      value: a.id,
      label: a.name,
    })),
    sourceId: (candidates.data?.items ?? []).map((candidate) => ({
      value: candidate.sourceId,
      label: (() => {
        const snapshot =
          candidate.snapshot &&
          typeof candidate.snapshot === "object" &&
          !Array.isArray(candidate.snapshot)
            ? (candidate.snapshot as Record<string, unknown>)
            : {};
        return `${snapshot.currency ?? ""} ${typeof snapshot.amount === "string" ? formatMoney(snapshot.amount) : ""} · ${snapshot.status ?? candidate.sourceState} · ${candidate.sourceId}`;
      })(),
      fields: { sourceHash: candidate.hash },
    })),
    incomeId: (recognitionIncomes.data?.items ?? []).map((i) => ({
      value: i.id,
      label: `${i.payer} · ${i.grossAmount}`,
      fields: { incomeRevision: i.revision },
    })),
    transactionId: transactionRows.map((t) => ({
      value: t.id,
      label: `${t.date.slice(0, 10)} · ${t.kind}`,
      fields: { transactionRevision: t.revision },
    })),
    returnId: (returns.data?.items ?? []).map((r) => ({
      value: r.id,
      label: `${r.status} · ${r.id}`,
    })),
  };
  const form = (
    title: string,
    initial: Fields,
    save: (values: Fields) => Promise<unknown>,
    extra = {},
  ) => (
    <FiscalForm
      key={title + tokenAsset + valued}
      title={title}
      userId={userId}
      scope={`${periodId}:${title}:new`}
      initial={initial}
      disabled={disabled}
      choices={choices}
      save={async (values) => {
        await save(clean(values) as Fields);
        await refresh();
      }}
      {...extra}
    />
  );
  return (
    <RecordNavigation.Provider
      value={{
        can: (key, id) =>
          key.toLowerCase().includes("evidence") ||
          [
            ...(incomes.data?.items ?? []),
            ...(transactions.data?.items ?? []),
            ...(deductions.data?.items ?? []),
            ...(credits.data?.items ?? []),
          ].some((row) => row.id === id),
        go: (key, id) => {
          const section = key.toLowerCase().includes("evidence")
            ? "Documentos"
            : incomes.data?.items.some((r) => r.id === id)
              ? "Ingresos"
              : transactions.data?.items.some((r) => r.id === id)
                ? "Movimientos"
                : deductions.data?.items.some((r) => r.id === id) ||
                    credits.data?.items.some((r) => r.id === id)
                  ? "Gastos y créditos"
                  : null;
          if (section) {
            setSelectedRecord(id);
            onTabChange(section);
          }
        },
      }}
    >
      <div className="space-y-4">
        {dialog}
        <div className="flex flex-wrap gap-3 text-xs text-[var(--ink-3)]">
          <span>
            {year} · {period.data.status}
          </span>
          <span>Revisión {period.data.revision}</span>
          {closed && (
            <strong>
              Ejercicio cerrado: registros protegidos; reabre con motivo para
              corregir.
            </strong>
          )}
        </div>
        {queries.some((q) => q.isPending) && (
          <p role="status">Actualizando registros…</p>
        )}
        {queries
          .filter((q) => q.error)
          .map((q, i) => (
            <p key={i} role="alert">
              {q.error?.message}{" "}
              <Button onClick={() => void q.refetch()}>Reintentar</Button>
            </p>
          ))}
        {message && <p role="status">{message}</p>}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Cuentas", "accounts", accounts.data],
              ["Ingresos", "incomes", incomes.data],
              ["Movimientos", "transactions", transactions.data],
              ["Gastos y créditos", "deductions", deductions.data],
              ["Gastos y créditos", "credits", credits.data],
              ["Retiros", "imports", candidates.data],
              [
                "Retiros",
                "saved",
                { nextCursor: candidates.data?.savedNextCursor },
              ],
              ["Retiros", "recognitionIncomes", recognitionIncomes.data],
              ["ISR y declaración", "returns", returns.data],
            ] as [string, string, unknown][]
          )
            .filter(([section]) => section === tab)
            .map(([, key, data]) => {
              const next = (data as { nextCursor?: string | null } | undefined)
                ?.nextCursor;
              return (
                <div key={key}>
                  {cursors[key] && (
                    <Button
                      onClick={() =>
                        setCursors((old) => ({ ...old, [key]: undefined }))
                      }
                    >
                      Primera página {key}
                    </Button>
                  )}
                  {next && (
                    <Button
                      onClick={() =>
                        setCursors((old) => ({ ...old, [key]: next }))
                      }
                    >
                      Siguiente página {key}
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
        {tab === "Resumen" && (
          <FiscalForm
            title="perfil del ejercicio"
            userId={userId}
            scope={`${periodId}:refresh-profile`}
            initial={{ reason: "" }}
            disabled={disabled}
            save={async (v) => {
              if (
                !(await confirm(
                  "¿Actualizar explícitamente el perfil de este ejercicio con el perfil fiscal actual? Los snapshots anteriores se conservan.",
                ))
              )
                return false;
              await refreshProfile.mutateAsync({
                ...write(v.requestId),
                reason: String(v.reason),
              });
              await refresh();
            }}
          />
        )}
        {tab === "Resumen" && (
          <Panel title="Resumen fiscal">
            {!overview.data?.hasReceipts && (
              <p>Sin registros de cobros conciliados.</p>
            )}
            {overview.data?.hasReceipts &&
              overview.data.valuationComplete &&
              /^0(?:\.0+)?$/.test(overview.data.receivedHnl ?? "") && (
                <p>Cero confirmado en los cobros registrados.</p>
              )}
            <p className="text-sm">
              Recibido conciliado HNL:{" "}
              <strong>{formatMoney(overview.data?.receivedHnl)}</strong>
            </p>
            <p>
              {overview.data?.valuationComplete
                ? "Valoración completa de los cobros registrados"
                : "Cobertura parcial: hay importes sin valorar o pendientes"}
            </p>
            <p>
              Un préstamo, aporte, transferencia o saldo inicial no constituye
              ingreso fiscal por registrar un movimiento.
            </p>
            <RecordList
              title="Saldos por activo"
              data={overview.data?.balances}
            />
            <RecordList
              title="Cobros por activo"
              data={overview.data?.receivedByAsset}
            />
          </Panel>
        )}
        {tab === "Cuentas" && (
          <Panel title="Cuentas fiscales">
            {form(
              "cuenta fiscal",
              { name: "", kind: "BANK", owned: true, archived: false },
              (v) =>
                accountSave.mutateAsync({
                  ...v,
                  requestId: String(v.requestId),
                } as Tax["accounts"]["save"]),
              {
                choices: {
                  kind: [
                    "BANK",
                    "EXCHANGE",
                    "WALLET",
                    "CASH",
                    "IN_TRANSIT",
                  ].map((value) => ({ value, label: value })),
                },
              },
            )}
            <RecordList title="Cuentas propias" data={accounts.data?.items} />
            {accountRows.map((account) => (
              <details key={account.id} className="mt-3">
                <summary>Editar cuenta {account.name}</summary>
                <FiscalForm
                  key={account.revision}
                  title="cuenta fiscal existente"
                  userId={userId}
                  scope={`account:${account.id}:revision:${account.revision}`}
                  initial={{
                    name: account.name,
                    kind: account.kind,
                    owned: account.owned,
                    archived: account.archived,
                  }}
                  disabled={disabled}
                  choices={{
                    kind: [
                      "BANK",
                      "EXCHANGE",
                      "WALLET",
                      "CASH",
                      "IN_TRANSIT",
                    ].map((value) => ({ value, label: value })),
                  }}
                  save={async (v) => {
                    await accountSave.mutateAsync({
                      ...v,
                      id: account.id,
                      recordRevision: account.revision,
                      requestId: String(v.requestId),
                    } as Tax["accounts"]["save"]);
                    await refresh();
                  }}
                />
              </details>
            ))}
          </Panel>
        )}
        {(tab === "Ingresos" ||
          tab === "Movimientos" ||
          tab === "Retiros" ||
          tab === "Gastos y créditos") && (
          <div className="flex flex-wrap gap-4 text-sm">
            <label>
              <input
                type="checkbox"
                checked={tokenAsset}
                onChange={(e) => setTokenAsset(e.target.checked)}
              />{" "}
              Activo token (red y contrato obligatorios)
            </label>
            <label>
              <input
                type="checkbox"
                checked={valued}
                onChange={(e) => setValued(e.target.checked)}
              />{" "}
              Adjuntar cotización explícita HNL
            </label>
            <p>
              Sin paridad automática USDC/USD. Para otra moneda fíat, modifica
              el código.
            </p>
          </div>
        )}
        {tab === "Ingresos" && (
          <Panel title="Ingresos">
            {form("ingreso", income(year, tokenAsset, valued), (v) =>
              incomeSave.mutateAsync({
                ...v,
                ...write(v.requestId),
              } as Tax["incomes"]["save"]),
            )}
            <RecordList
              title="Ingresos registrados"
              data={incomes.data?.items}
            />
            {incomes.data?.items.map((row) => (
              <RecordEditor
                key={row.id}
                record={row}
                kind="income"
                userId={userId}
                periodId={periodId}
                disabled={disabled}
                choices={choices}
                save={async (v) => {
                  await incomeSave.mutateAsync({
                    ...v,
                    ...write(v.requestId),
                  } as Tax["incomes"]["save"]);
                  await refresh();
                }}
              />
            ))}
          </Panel>
        )}
        {tab === "Movimientos" && (
          <Panel title="Movimientos y wallets">
            <p className="text-sm mb-3">
              Guarda borrador y luego contabiliza. Transferencias: origen
              negativo y destino positivo. Conversión: ambos activos y relación
              explícita. Comisión: apunte separado.
            </p>
            {form("movimiento", transaction(year, tokenAsset, valued), (v) =>
              transactionSave.mutateAsync({
                ...v,
                ...write(v.requestId),
              } as Tax["transactions"]["save"]),
            )}
            {transactionRows.map((t) => (
              <div
                key={t.id}
                id={t.id}
                className="mt-4 border-t border-[var(--line)] pt-3"
              >
                <RecordList title={`${t.kind} · ${t.status}`} data={t} />
                {t.status === "DRAFT" && (
                  <RecordEditor
                    record={t}
                    kind="transaction"
                    userId={userId}
                    periodId={periodId}
                    disabled={disabled}
                    choices={choices}
                    save={async (v) => {
                      await transactionSave.mutateAsync({
                        ...v,
                        ...write(v.requestId),
                      } as Tax["transactions"]["save"]);
                      await refresh();
                    }}
                  />
                )}
                {t.status === "DRAFT" && (
                  <Button
                    disabled={disabled}
                    onClick={() =>
                      void run(() =>
                        post.mutateAsync({
                          ...write(),
                          id: t.id,
                          recordRevision: t.revision,
                        }),
                      )
                    }
                  >
                    Contabilizar {t.id}
                  </Button>
                )}
                {t.status === "DRAFT" && (
                  <FiscalForm
                    title="descarte de movimiento"
                    userId={userId}
                    scope={`${periodId}:discard:${t.id}`}
                    initial={{ reason: "" }}
                    disabled={disabled}
                    save={async (v) => {
                      if (
                        !(await confirm(
                          "¿Descartar este borrador sin contabilizar? El motivo queda en el historial fiscal.",
                        ))
                      )
                        return false;
                      await discard.mutateAsync({
                        ...write(v.requestId),
                        id: t.id,
                        recordRevision: t.revision,
                        reason: String(v.reason),
                      });
                      await refresh();
                    }}
                  />
                )}
                {t.status === "POSTED" && !t.reversalOfId && (
                  <FiscalForm
                    title="reverso"
                    userId={userId}
                    scope={`${periodId}:reverse:${t.id}`}
                    initial={{ date: fiscalDate(year), reason: "" }}
                    disabled={disabled}
                    save={async (v) => {
                      if (
                        !(await confirm(
                          "¿Confirmar reverso exacto? Conserva el historial y requiere revisión del ingreso asociado.",
                        ))
                      )
                        return false;
                      await reverse.mutateAsync({
                        ...write(),
                        id: t.id,
                        recordRevision: t.revision,
                        ...v,
                      } as Tax["transactions"]["reverse"]);
                      await refresh();
                    }}
                  />
                )}
              </div>
            ))}
          </Panel>
        )}
        {tab === "Gastos y créditos" && (
          <>
            <Panel title="Gastos y deducciones">
              {form(
                "gasto o deducción",
                {
                  kind: "EXPENSE",
                  category: "",
                  description: "",
                  date: fiscalDate(year),
                  amount: "0",
                  asset: tokenAsset ? token : asset,
                  ...(valued
                    ? {
                        valuation: {
                          ...valuation,
                          base: tokenAsset ? token : asset,
                        },
                      }
                    : {}),
                  admittedHnl: "",
                  componentKey: "",
                  treatment: "PENDING",
                  treatmentReason: "",
                  legalReference: "",
                },
                (v) =>
                  deductionSave.mutateAsync({
                    ...v,
                    ...write(v.requestId),
                  } as Tax["deductions"]["save"]),
                {
                  choices: {
                    ...choices,
                    kind: ["EXPENSE", "DEDUCTION"].map((value) => ({
                      value,
                      label: value,
                    })),
                  },
                },
              )}
              <RecordList
                title="Gastos registrados"
                data={deductions.data?.items}
              />
              {deductions.data?.items.map((row) => (
                <RecordEditor
                  key={row.id}
                  record={row}
                  kind="deduction"
                  userId={userId}
                  periodId={periodId}
                  disabled={disabled}
                  choices={{
                    ...choices,
                    kind: ["EXPENSE", "DEDUCTION"].map((value) => ({
                      value,
                      label: value,
                    })),
                  }}
                  save={async (v) => {
                    await deductionSave.mutateAsync({
                      ...v,
                      ...write(v.requestId),
                    } as Tax["deductions"]["save"]);
                    await refresh();
                  }}
                />
              ))}
            </Panel>
            <Panel title="Retenciones y créditos">
              {form(
                "crédito",
                {
                  kind: "WITHHOLDING",
                  payer: "",
                  date: fiscalDate(year),
                  reference: "",
                  amountHnl: "0.00",
                  previouslyAppliedHnl: "0.00",
                  admittedHnl: "",
                  componentKey: "",
                  treatment: "PENDING",
                  treatmentReason: "",
                  legalReference: "",
                },
                (v) =>
                  creditSave.mutateAsync({
                    ...v,
                    ...write(v.requestId),
                  } as Tax["credits"]["save"]),
                {
                  choices: {
                    ...choices,
                    kind: ["WITHHOLDING", "PREPAYMENT", "OTHER"].map(
                      (value) => ({
                        value,
                        label: value,
                      }),
                    ),
                  },
                },
              )}
              <RecordList
                title="Créditos registrados"
                data={credits.data?.items}
              />
              {credits.data?.items.map((row) => (
                <RecordEditor
                  key={row.id}
                  record={row}
                  kind="credit"
                  userId={userId}
                  periodId={periodId}
                  disabled={disabled}
                  choices={{
                    ...choices,
                    kind: ["WITHHOLDING", "PREPAYMENT", "OTHER"].map(
                      (value) => ({ value, label: value }),
                    ),
                  }}
                  save={async (v) => {
                    await creditSave.mutateAsync({
                      ...v,
                      ...write(v.requestId),
                    } as Tax["credits"]["save"]);
                    await refresh();
                  }}
                />
              ))}
            </Panel>
          </>
        )}
        {tab === "Retiros" && (
          <Panel title="Propuestas de retiros">
            <label className="block my-3 text-sm">
              Ejercicio de reconocimiento del ingreso existente
              <select
                className="w-full p-2 bg-[var(--panel-2)] rounded"
                value={recognitionPeriod}
                onChange={(e) => {
                  setRecognitionPeriod(e.target.value);
                  setCursors((old) => ({
                    ...old,
                    recognitionIncomes: undefined,
                  }));
                }}
              >
                {fiscalPeriods.data?.items.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.year} · {p.status}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm">
              Un ingreso de un año cerrado puede vincularse a un cobro de este
              ejercicio sin volver a crear renta. Indica la revisión mostrada
              junto al ingreso.
            </p>
            <p>
              Importar crea registros; vincular asigna registros existentes. No
              clasifica FTMO automáticamente.
            </p>
            <RecordList
              title="Propuestas actuales"
              data={candidates.data?.items}
            />
            <RecordList
              title="Fuentes conservadas"
              data={candidates.data?.saved}
            />
            {form(
              "conciliación vinculada",
              {
                incomeId: "",
                incomeRevision: 1,
                transactionId: "",
                transactionRevision: 1,
                receivedDate: fiscalDate(year),
                receiptConfirmed: false,
                evidenceReference: "",
                reason: "",
                allocations: [
                  {
                    grossAmount: "0",
                    netAmount: "0",
                    feeAmount: "0",
                    withheldAmount: "0",
                    sourceId: "",
                    sourceHash: "",
                    sourceAmount: "",
                    ...(valued
                      ? {
                          conversion: {
                            sourceValuation: { ...valuation, base: asset },
                            receiptValuation: { ...valuation, base: token },
                            reason: "",
                          },
                        }
                      : {}),
                  },
                ],
              },
              (v) =>
                reconcile.mutateAsync({
                  ...v,
                  ...write(v.requestId),
                } as Tax["imports"]["reconcile"]),
            )}
            {form(
              "importación con nuevos registros",
              {
                newIncome: {
                  ...income(year, tokenAsset, valued),
                  periodId,
                  expectedRevision: period.data.revision,
                  requestId: crypto.randomUUID(),
                },
                newReceipt: {
                  ...transaction(year, tokenAsset, valued),
                  periodId,
                  expectedRevision: period.data.revision,
                  requestId: crypto.randomUUID(),
                },
                receivedDate: fiscalDate(year),
                receiptConfirmed: false,
                evidenceReference: "",
                reason: "",
                allocations: [
                  {
                    grossAmount: "0",
                    netAmount: "0",
                    feeAmount: "0",
                    withheldAmount: "0",
                    sourceId: "",
                    sourceHash: "",
                    sourceAmount: "",
                    ...(valued
                      ? {
                          conversion: {
                            sourceValuation: { ...valuation, base: asset },
                            receiptValuation: { ...valuation, base: token },
                            reason: "",
                          },
                        }
                      : {}),
                  },
                ],
              },
              (v) =>
                reconcile.mutateAsync({
                  ...v,
                  ...write(v.requestId),
                } as Tax["imports"]["reconcile"]),
            )}
            {form(
              "descarte documentado",
              { sourceId: "", sourceHash: "", reason: "" },
              (v) =>
                dismiss.mutateAsync({
                  ...v,
                  ...write(v.requestId),
                } as Tax["imports"]["dismiss"]),
            )}
          </Panel>
        )}
        {tab === "Documentos" && (
          <EvidencePanel
            userId={userId}
            periodId={periodId}
            revision={period.data.revision}
            disabled={disabled}
            closed={closed}
            uploadBlocked={mutationPending}
            filingReturns={archivedReturns.map((item) => ({ id: item.id, label: `Declaración ${item.id}` }))}
            refresh={refresh}
            records={{
              income: incomes.data?.items ?? [],
              transaction: transactions.data?.items ?? [],
              deduction: deductions.data?.items ?? [],
              credit: credits.data?.items ?? [],
            }}
          />
        )}
        {tab === "ISR y declaración" && (
          <>
            <Panel title="Estimación ISR">
              {year !== 2026 && (
                <p>
                  Sin reglas publicadas para este ejercicio. Puedes conservar
                  registros y evidencias; la simulación permanece deshabilitada.
                </p>
              )}
              <p>{preview.data?.notice}</p>
              <p>
                Estado: {preview.data?.status ?? "Sin calcular"} ·{" "}
                {preview.data?.pending.length
                  ? "Estimación parcial"
                  : "Cobertura completa de los registros"}
              </p>
              <p>
                Impuesto: {formatMoney(preview.data?.calculation?.tax)} HNL ·
                Saldo a pagar:{" "}
                {formatMoney(preview.data?.calculation?.balanceDue)} HNL
              </p>
              <p>
                Un cero calculado sólo cubre registros admitidos; revisa todos
                los pendientes.
              </p>
              <RecordList
                title="Pendientes y cobertura"
                data={preview.data?.pending}
              />
              <RecordList
                title="Formulario 102 preliminar"
                data={preview.data?.form}
              />
              <FiscalForm
                title="simulación de solo lectura"
                disabled={year !== 2026 || busy}
                userId={userId}
                scope={`${periodId}:simulation`}
                initial={{ additionalIncomeHnl: "0.00" }}
                save={(v) => setSimulation(String(v.additionalIncomeHnl))}
              />
              {simulation !== undefined && (
                <>
                  <p>
                    Simulación:{" "}
                    {sim.isPending
                      ? "Calculando…"
                      : formatMoney(
                          sim.data && "simulation" in sim.data
                            ? sim.data.simulation?.calculation?.balanceDue
                            : null,
                        )}{" "}
                    HNL
                  </p>
                  {sim.error && (
                    <p role="alert">
                      {sim.error.message}
                      <Button onClick={() => void sim.refetch()}>
                        Reintentar simulación
                      </Button>
                    </p>
                  )}
                </>
              )}
            </Panel>
            <Panel title="Información y revisión manual">
              <p className="text-sm mb-3">
                Las conversiones, disposiciones y recepciones sin conciliar
                requieren un criterio documentado: indica método, fundamento,
                documento y casilla. Vincula los registros económicos que ya
                recogen su importe. Una decisión de «No gravables» también
                requiere respaldo. Los borradores deben contabilizarse o
                descartarse desde Movimientos.
              </p>
              {form(
                "información del ejercicio",
                {
                  roundingConfirmed: period.data.roundingConfirmed,
                  information:
                    period.data.information &&
                    typeof period.data.information === "object"
                      ? {
                          ...(period.data.information as Fields),
                          reviews: Array.isArray(
                            (period.data.information as Fields).reviews,
                          )
                            ? (
                                (period.data.information as Fields)
                                  .reviews as Fields[]
                              ).map((item) => ({ ...review, ...item }))
                            : [review],
                        }
                      : information.information,
                },
                (v) =>
                  infoSave.mutateAsync({
                    ...v,
                    ...write(v.requestId),
                  } as Tax["periods"]["updateInformation"]),
                {
                  key: `information:${period.data.revision}`,
                  scope: `${periodId}:information:revision:${period.data.revision}`,
                  choices: {
                    ...choices,
                    kind: [
                      "income",
                      "deduction",
                      "credit",
                      "reversal",
                      "transaction",
                    ].map((value) => ({ value, label: value })),
                  },
                },
              )}
            </Panel>
            <Panel title="Preparación y archivo 102">
              <Button
                disabled={disabled}
                loading={prepare.isPending}
                onClick={() => void run(() => prepare.mutateAsync(write()))}
              >
                Preparar borrador 102
              </Button>
              <p>
                El cierre revalida y conserva un snapshot inmutable. Exportar no
                presenta ante SAR.
              </p>
              {returns.data?.items.map((r) => (
                <div
                  id={r.id}
                  key={r.id}
                  className="border-t border-[var(--line)] py-4 space-y-3"
                >
                  <p>
                    {r.id} · {r.status}
                  </p>
                  <details>
                    <summary>Snapshot y trazabilidad</summary>
                    <RecordList title="Snapshot" data={r} />
                  </details>
                  <div className="flex flex-wrap gap-3">
                    {["json", "csv", "pdf"].map((format) => (
                      <a
                        key={format}
                        className="underline"
                        href={`/api/tax/export?returnId=${encodeURIComponent(r.id)}&format=${format}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Exportar {format.toUpperCase()}
                      </a>
                    ))}
                    <Button
                      disabled={disabled || r.status !== "READY" || Boolean(r.closedAt)}
                      onClick={async () => {
                        if (
                          await confirm("¿Cerrar ejercicio con este snapshot?")
                        )
                          void run(() =>
                            close.mutateAsync({ ...write(), returnId: r.id }),
                          );
                      }}
                    >
                      Cerrar ejercicio
                    </Button>
                  </div>
                </div>
              ))}
              {closed && (
                <FiscalForm
                  title="reapertura"
                  userId={userId}
                  scope={`${periodId}:reopen`}
                  initial={{ reason: "" }}
                  disabled={busy}
                  save={async (v) => {
                    if (
                      !(await confirm(
                        "¿Reabrir ejercicio? Se conserva el snapshot anterior.",
                      ))
                    )
                      return false;
                    await reopen.mutateAsync({
                      ...write(v.requestId),
                      reason: String(v.reason),
                    });
                    await refresh();
                  }}
                />
              )}
              <FiscalForm
                title="acuse de presentación"
                userId={userId}
                scope={`${periodId}:filed`}
                initial={{
                  returnId: "",
                  rtn: "",
                  filingReference: "",
                  receiptEvidenceId: "",
                  reportedFiledAt: "",
                }}
                disabled={mutationPending || fileableReturns.length === 0}
                choices={{
                  ...choices,
                  returnId: fileableReturns.map((item) => ({ value: item.id, label: `Declaración ${item.id}` })),
                }}
                save={async (v) => {
                  await filed.mutateAsync({
                    ...v,
                    ...write(v.requestId),
                  } as Tax["returns"]["reportFiled"]);
                  await refresh();
                }}
              />
            </Panel>
          </>
        )}
      </div>
    </RecordNavigation.Provider>
  );
}
export function RecordList({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {data == null ? (
        <p>Sin datos calculados</p>
      ) : Array.isArray(data) ? (
        data.length ? (
          data.map((row, index) => (
            <div
              key={index}
              className="p-3 mb-2 rounded bg-[var(--panel-2)] break-words text-xs"
            >
              <RecordValue value={row} />
            </div>
          ))
        ) : (
          <p>Sin registros</p>
        )
      ) : (
        <RecordValue value={data} />
      )}
    </div>
  );
}
function RecordValue({ value }: { value: unknown }) {
  const navigate = useContext(RecordNavigation);
  if (value == null) return <span>Sin calcular</span>;
  if (Array.isArray(value))
    return (
      <div>
        {value.map((item, i) => (
          <RecordValue key={i} value={item} />
        ))}
      </div>
    );
  if (typeof value === "object")
    return (
      <dl className="grid grid-cols-[minmax(90px,1fr)_2fr] gap-x-3 gap-y-1 text-xs">
        {Object.entries(value)
          .filter(
            ([key]) =>
              ![
                "userId",
                "storageKey",
                "bucket",
                "url",
                "signedUrl",
                "rtn",
              ].includes(key),
          )
          .map(([key, item]) => (
            <div key={key} className="contents">
              <dt className="text-[var(--ink-3)] break-words">
                {labels[key] ?? key}
              </dt>
              <dd className="min-w-0 break-words">
                {navigate &&
                typeof item === "string" &&
                (key === "id" || key.endsWith("Id")) &&
                navigate.can(key, item) ? (
                  <Button variant="link" onClick={() => navigate.go(key, item)}>
                    {item}
                  </Button>
                ) : typeof item === "string" &&
                  /^-?\d+(?:\.\d+)?$/.test(item) &&
                  /amount|hnl|quantity|rate|tax|balance|gross|net|fee|withheld/i.test(
                    key,
                  ) ? (
                  formatMoney(item)
                ) : (
                  <RecordValue value={item} />
                )}
              </dd>
            </div>
          ))}
      </dl>
    );
  return (
    <span>
      {typeof value === "boolean"
        ? value
          ? "Sí"
          : "No"
        : (enumLabels[String(value)] ?? String(value))}
    </span>
  );
}
