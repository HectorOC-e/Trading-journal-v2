"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ASSESSMENT_LABELS, backtestWorkSchema, type BacktestTrade, type BacktestWork } from "@/domains/learning/backtest-session"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"
import { PracticeModal } from "../../modals/practice-modal"
import { Label, NotesField, panel, selectClass, TextField, textLink } from "./fields"
import { ReportSummary } from "./report"

type Session = RouterOutputs["backtestSessions"]["get"]
type Preview = RouterOutputs["backtestSessions"]["preview"]
type Annotation = NonNullable<BacktestTrade["annotations"]>
const annotationLabels = { context: "Contexto", entryReason: "Motivo de entrada", riskPlan: "Invalidación y riesgo planeado", adjustmentReason: "Motivo de ajustes", exitReason: "Motivo de salida", lesson: "Lección", outOfRange: "Justificación fuera del rango", excluded: "Motivo para excluir una operación abierta" } as const

function EvidencePicker({ kind, selected, onSelect }: { kind: "trades" | "practices"; selected: string[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("")
  const candidates = trpc.backtestSessions.candidates.useInfiniteQuery({ kind, query }, { getNextPageParam: page => page.next ?? undefined })
  const label = kind === "trades" ? "operaciones de Backtesting" : "prácticas"
  return <details className="rounded-lg border border-[var(--line)] p-3"><summary className="cursor-pointer font-medium">Vincular {label}</summary>
    <div className="mt-3 space-y-2">
      <Label text={`Buscar ${label}`}><Input maxLength={120} value={query} onChange={e => setQuery(e.target.value)} /></Label>
      {candidates.isLoading && <p role="status" className="text-sm">Cargando…</p>}
      {candidates.error && <p role="alert" className="text-sm">No se pudo cargar. <Button variant="link" onClick={() => void candidates.refetch()}>Reintentar</Button></p>}
      {candidates.data && <ul className="max-h-60 space-y-1 overflow-auto text-sm">{candidates.data.pages.flatMap(p => p.items).map(item => <li key={item.id}><label className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onSelect(item.id)} />{item.date} · {item.title}</label></li>)}</ul>}
      {candidates.data?.pages[0]?.items.length === 0 && <p className="text-sm">Sin coincidencias.</p>}
      {candidates.hasNextPage && <Button type="button" size="sm" loading={candidates.isFetchingNextPage} onClick={() => void candidates.fetchNextPage()}>Cargar más</Button>}
    </div>
  </details>
}

function TradeNotes({ trade, value, onChange }: { trade: BacktestTrade & { outsideRange: boolean }; value: Annotation; onChange: (patch: Partial<Annotation>) => void }) {
  return <details className="rounded-lg border border-[var(--line)] p-3"><summary className="cursor-pointer font-medium">{trade.symbol} · {trade.date} · {trade.status === "CLOSED" ? `${trade.r ?? "—"} R` : "Abierta"}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm text-[var(--ink-2)]">{trade.direction} · {trade.account} · Entrada {trade.entry} · Stop {trade.stop} · Objetivo {trade.target} · Cierre {trade.closePrice ?? "—"}</p>
      {trade.planNotes && <p className="whitespace-pre-wrap text-sm">Plan en Trades · {trade.planNotes}</p>}
      {trade.notes && <p className="whitespace-pre-wrap text-sm">Notas en Trades · {trade.notes}</p>}
      {trade.events.length > 0 && <ul className="space-y-1 text-sm">{trade.events.map((e, i) => <li key={i}>{e.type} · {e.at} · Precio {e.price ?? "—"} · Tamaño {e.size ?? "—"} · {e.notes}</li>)}</ul>}
      <div className="grid gap-3 sm:grid-cols-2">{Object.entries(annotationLabels).filter(([key]) => (key !== "outOfRange" || trade.outsideRange) && (key !== "excluded" || trade.status !== "CLOSED")).map(([key, label]) => {
        const field = key as keyof typeof annotationLabels
        return <NotesField key={key} label={label} value={value[field] ?? ""} onChange={text => onChange({ [field]: text })} />
      })}</div>
      <Label text="Cumplimiento del checklist"><select className={selectClass} value={value.compliant == null ? "source" : String(value.compliant)} onChange={e => onChange({ compliant: e.target.value === "source" ? null : e.target.value === "true" })}><option value="source">{trade.checklist?.source === "journal" ? "Cumplido según Trades" : "Usar evidencia de Trades si coincide"}</option><option value="true">Cumplido</option><option value="false">Incumplido</option></select></Label>
      <Link className={textLink} href={`/trades?mode=BACKTEST&trade=${trade.id}`}>Consultar operación en Trades</Link>
    </div>
  </details>
}

function Signals({ work, attachments, set, day }: { work: BacktestWork; attachments: Session["attachments"]; set: (signals: BacktestWork["signals"]) => void; day?: string }) {
  return <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Señales descartadas</h2>
    {work.signals.map((s, i) => {
      const update = (patch: Partial<typeof s>) => set(work.signals.map((signal, k) => k === i ? { ...signal, ...patch } : signal))
      return <div key={i} className="grid gap-3 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-2">
        <TextField label="Fecha de mercado" type="date" value={s.date} onChange={date => update({ date })} />
        <TextField label="Símbolo" value={s.symbol} onChange={symbol => update({ symbol })} maxLength={40} />
        <NotesField label="Contexto de la señal" value={s.context} onChange={context => update({ context })} />
        <NotesField label="Por qué la descartaste" value={s.reason} onChange={reason => update({ reason })} />
        {attachments.length > 0 && <Label text="Captura de la señal"><select className={selectClass} value={s.captureId ?? ""} onChange={e => update({ captureId: e.target.value || undefined })}><option value="">Sin captura</option>{attachments.map((a, k) => <option key={a.id} value={a.id}>{a.label} · captura {k + 1}</option>)}</select></Label>}
        <Button size="sm" onClick={() => set(work.signals.filter((_, k) => k !== i))}>Quitar señal {i + 1}</Button>
      </div>
    })}
    <Button size="sm" disabled={work.signals.length >= 100} onClick={() => set([...work.signals, { date: day ?? "", symbol: "", context: "", reason: "" }])}>Añadir señal descartada</Button>
  </section>
}

export function SessionEditor({ initial, tradeId, onClosed }: { initial: Session; tradeId?: string; onClosed: () => Promise<void> }) {
  const [session, setSession] = useState(initial)
  const [work, setWork] = useState<BacktestWork>(() => tradeId && !initial.work.tradeIds.includes(tradeId) ? { ...initial.work, tradeIds: [...initial.work.tradeIds, tradeId] } : initial.work)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [day, setDay] = useState("")
  const [coachDraft, setCoachDraft] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const requestId = useRef<string | null>(null)
  const options = trpc.backtestSessions.options.useQuery()
  const utils = trpc.useUtils()
  const save = trpc.backtestSessions.save.useMutation()
  const inspect = trpc.backtestSessions.preview.useMutation()
  const close = trpc.backtestSessions.close.useMutation()
  const coach = trpc.backtestSessions.coach.useMutation()
  const dirty = JSON.stringify(session.work) !== JSON.stringify(work)
  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function change(patch: Partial<BacktestWork>) {
    setWork(w => {
      const today = options.data?.today
      const evidenceChanged = !!(patch.tradeIds || patch.practiceIds || patch.tradeNotes || patch.signals)
      const workDays = today && evidenceChanged && w.workDays.length < 100 ? [...new Set([...w.workDays, today])].sort() : w.workDays
      return { ...w, workDays, ...patch }
    }); setPreview(null); setConfirmed(false); setNotice("")
  }

  function switchId(field: "tradeIds" | "practiceIds" | "captureIds", id: string) {
    const ids = work[field].includes(id) ? work[field].filter(value => value !== id) : [...work[field], id]
    if (field === "practiceIds" && !ids.includes(id)) {
      const removed = new Set(session.attachments.filter(a => a.practiceId === id).map(a => a.id))
      change({ [field]: ids, captureIds: work.captureIds.filter(a => !removed.has(a)), signals: work.signals.map(s => s.captureId && removed.has(s.captureId) ? { ...s, captureId: undefined } : s) })
    } else change({ [field]: ids })
  }

  async function refresh() {
    const current = await utils.backtestSessions.get.fetch({ id: session.id }, { staleTime: 0 })
    setSession(current); setWork(current.work)
    return current
  }

  async function persist() {
    if (!dirty) return session
    const result = backtestWorkSchema.safeParse(work)
    if (!result.success) throw new Error(`Completa o corrige ${result.error.issues[0]?.path.join(" · ") || "la evidencia"}.`)
    await save.mutateAsync({ id: session.id, revision: session.revision, work: result.data })
    if (tradeId) {
      const url = new URL(window.location.href)
      url.searchParams.delete("trade")
      window.history.replaceState(null, "", url)
    }
    return refresh()
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("")
    try { await action() }
    catch (e) { setError(e instanceof Error ? e.message : "La operación no se pudo completar.") }
    finally { setBusy(false) }
  }

  const samples = session.trades.filter(t => work.tradeIds.includes(t.id) || session.practiceTradeIds[t.id]?.some(id => work.practiceIds.includes(id)))
  const pending = work.tradeIds.filter(id => !session.trades.some(t => t.id === id)).length + work.practiceIds.filter(id => !session.practices.some(p => p.id === id)).length
  return <div className="space-y-4">
    <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Evidencia y jornadas</h2>
      <fieldset disabled={busy} className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" size="sm" onClick={() => setPracticeOpen(true)}>Registrar práctica</Button>
          {dirty ? <Button size="sm" onClick={() => void run(async () => { await persist(); window.location.assign(`/trades?mode=BACKTEST&backtestSession=${session.id}&registerHistorical=1`) })}>Guardar y registrar trade histórico</Button> : <Link className={textLink} href={`/trades?mode=BACKTEST&backtestSession=${session.id}&registerHistorical=1`}>Registrar trade histórico</Link>}
        </div>
        <EvidencePicker kind="trades" selected={work.tradeIds} onSelect={id => switchId("tradeIds", id)} />
        <EvidencePicker kind="practices" selected={work.practiceIds} onSelect={id => switchId("practiceIds", id)} />
        {pending > 0 && <p className="text-sm">{pending} vínculos nuevos. Guarda para ver sus fichas.</p>}
        {session.practices.filter(p => work.practiceIds.includes(p.id)).map(p => <div key={p.id} className="flex flex-wrap gap-2 text-sm"><span>{p.title} · {p.date} · {p.duration} min</span><Button size="xs" onClick={() => switchId("practiceIds", p.id)}>Desvincular práctica</Button></div>)}
        <div className="flex flex-wrap items-end gap-2"><TextField label="Jornada de trabajo" type="date" value={day} onChange={setDay} max={options.data?.today} /><Button size="sm" disabled={!day} onClick={() => { change({ workDays: [...new Set([...work.workDays, day])].sort() }); setDay("") }}>Añadir jornada</Button></div>
        <ul className="flex flex-wrap gap-2 text-sm">{work.workDays.map(value => <li key={value} className="flex items-center gap-1 rounded bg-[var(--chip)] px-2">{value}<Button size="xs" variant="icon" aria-label={`Quitar jornada ${value}`} onClick={() => change({ workDays: work.workDays.filter(d => d !== value) })}>×</Button></li>)}</ul>
        <NotesField label="Observaciones y cambios de criterio" value={work.observations} onChange={observations => change({ observations })} />
      </fieldset>
    </section>
    <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Diario de operaciones</h2><fieldset disabled={busy} className="space-y-2">
      {samples.length === 0 && <p className="text-sm">Vincula y guarda operaciones para completar sus fichas.</p>}
      {samples.map(t => <div key={t.id} className="space-y-1"><TradeNotes trade={t} value={work.tradeNotes[t.id] ?? {}} onChange={patch => change({ tradeNotes: { ...work.tradeNotes, [t.id]: { ...work.tradeNotes[t.id], ...patch } } })} />{work.tradeIds.includes(t.id) && <Button size="xs" variant="link" onClick={() => switchId("tradeIds", t.id)}>Quitar vínculo directo de {t.symbol}</Button>}</div>)}
      {work.tradeIds.filter(id => !session.trades.some(t => t.id === id)).map(id => <p key={id} className="text-sm">Operación pendiente · {id.slice(0, 8)} <Button size="xs" variant="link" onClick={() => switchId("tradeIds", id)}>Quitar vínculo</Button></p>)}
      {work.practiceIds.filter(id => !session.practices.some(p => p.id === id)).map(id => <p key={id} className="text-sm">Práctica pendiente · {id.slice(0, 8)} <Button size="xs" variant="link" onClick={() => switchId("practiceIds", id)}>Quitar vínculo</Button></p>)}
    </fieldset></section>
    <fieldset disabled={busy}><Signals work={work} attachments={session.attachments.filter(a => work.practiceIds.includes(a.practiceId))} set={signals => change({ signals })} day={session.plan.from} /></fieldset>
    {session.attachments.length > 0 && <fieldset disabled={busy} className={`${panel} space-y-2`}><legend className="sr-only">Capturas del PDF</legend><h2 className="text-lg font-semibold">Capturas del PDF</h2><p className="text-sm">Selecciona hasta ocho capturas de tus prácticas, con un máximo total de 8 MB.</p>{session.attachments.filter(a => work.practiceIds.includes(a.practiceId)).map((a, i) => <label key={a.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={work.captureIds.includes(a.id)} onChange={() => switchId("captureIds", a.id)} />{a.label} · captura {i + 1}</label>)}</fieldset>}
    <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Evaluar y cerrar</h2><fieldset disabled={busy} className="space-y-3">
      {session.plan.objectives.map((o, i) => {
        const value = work.evaluations[i]
        const update = (patch: Partial<BacktestWork["evaluations"][string]>) => change({ evaluations: { ...work.evaluations, [i]: { ...(value ?? { state: "insufficient", comment: "" }), ...patch } } })
        return <div key={i} className="space-y-2 rounded-lg border border-[var(--line)] p-3"><h3 className="font-medium">{o.title}</h3><p className="text-sm">{o.criterion}</p>
          {o.metric === "manual" && <Label text={`Evaluación de ${o.title}`}><select className={selectClass} value={value?.state ?? ""} onChange={e => update({ state: e.target.value as BacktestWork["evaluations"][string]["state"] })}><option value="" disabled>Selecciona una evaluación</option>{Object.entries(ASSESSMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Label>}
          <NotesField label="Comentario del objetivo" value={value?.comment ?? ""} onChange={comment => update({ comment })} />
        </div>
      })}
      <NotesField label="Conclusión y límites de la muestra" value={work.conclusion} onChange={conclusion => change({ conclusion })} />
      <NotesField label="Siguiente ejercicio" value={work.nextStep} onChange={nextStep => change({ nextStep })} />
      <Button size="sm" onClick={() => void run(async () => { const current = await persist(); const result = await coach.mutateAsync({ id: current.id, revision: current.revision }); setCoachDraft(result.comment) })}>Analizar con Coach IA</Button>
      {coachDraft && <div className="space-y-2 rounded bg-[var(--panel-2)] p-3"><NotesField label="Comentario sugerido por el Coach" value={coachDraft} onChange={setCoachDraft} maxLength={6000} /><Button size="sm" onClick={() => { change({ coach: coachDraft }); setCoachDraft("") }}>Incluir comentario en el informe</Button></div>}
      {work.coach && <div className="space-y-2"><p className="whitespace-pre-wrap text-sm">{work.coach}</p><Button size="sm" onClick={() => change({ coach: null })}>Quitar comentario del informe</Button></div>}
    </fieldset></section>
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !dirty} onClick={() => void run(async () => { await persist(); setNotice("Avance guardado.") })}>Guardar avance</Button>
      <Button variant="primary" loading={inspect.isPending} disabled={busy} onClick={() => void run(async () => { await persist(); setPreview(await inspect.mutateAsync({ id: session.id })); setConfirmed(false); requestId.current = crypto.randomUUID() })}>Revisar resumen de cierre</Button></div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-[var(--loss)]">{error}</p>}
    {preview && <><ReportSummary report={preview.report} changes={preview.changes} />
      {preview.report.blockers.length === 0 && <div className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />He revisado la evidencia y las capturas seleccionadas.</label>
        <Button variant="primary" loading={close.isPending} disabled={busy || !confirmed || dirty} onClick={() => void run(async () => {
          await close.mutateAsync({ id: session.id, revision: session.revision, signature: preview.signature, requestId: requestId.current! }); await onClosed()
        })}>Cerrar sesión y guardar informe</Button></div>}
    </>}
    {practiceOpen && <PracticeModal record={null} today={options.data?.today} initialDraft={{ sourceKey: `backtest-session:${session.id}`, title: session.plan.title, objective: session.plan.objectives[0]?.title || session.plan.hypothesis.slice(0, 1000), exercise: session.plan.rules || session.plan.hypothesis, kind: "EXECUTION", operationalMode: "BACKTEST" }} onClose={() => setPracticeOpen(false)} onChanged={() => void utils.learningPractices.invalidate()} onSaved={record => {
      if (record.operationalMode === "BACKTEST" || record.kind === "CONCEPT") {
        setWork(w => ({ ...w, practiceIds: [...new Set([...w.practiceIds, record.id])] })); setPreview(null); setConfirmed(false); void utils.backtestSessions.candidates.invalidate()
      }
    }} />}
  </div>
}
