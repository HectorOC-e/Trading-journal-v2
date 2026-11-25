"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TopBar } from "@/components/layout/top-bar"
import { trpc } from "@/lib/trpc/client"
import { Label, panel, pdfHref, selectClass, sessionsPath, TextField, textLink } from "./fields"
import { PlanForm } from "./plan-form"
import { ClosedReport } from "./report"
import { SessionEditor } from "./session-editor"

const states = { DRAFT: "Borrador", ACTIVE: "En curso", CLOSED: "Cerrada" } as const
const stateLabel = (state: string) => states[state as keyof typeof states] ?? state

function SessionList() {
  const [status, setStatus] = useState<keyof typeof states | "">("")
  const [setupId, setSetupId] = useState("")
  const [day, setDay] = useState("")
  const options = trpc.backtestSessions.options.useQuery()
  const query = trpc.backtestSessions.list.useInfiniteQuery({ status: status || undefined, setupId: setupId || undefined, day: day || undefined }, { getNextPageParam: page => page.next ?? undefined })
  const sessions = query.data?.pages.flatMap(page => page.items) ?? []
  return <section className={`${panel} space-y-4`} aria-label="Historial de sesiones de backtesting">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Historial de sesiones</h2><Link className={textLink} href={`${sessionsPath}?new=1`}>Nueva sesión</Link></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Label text="Estado"><select className={selectClass} value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="">Todos los estados</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Label>
      <Label text="Setup"><select className={selectClass} value={setupId} onChange={e => setSetupId(e.target.value)}><option value="">Todos los setups</option>{options.data?.setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Label>
      <TextField label="Fecha de trabajo" type="date" value={day} onChange={setDay} />
    </div>
    {query.isLoading && <p role="status">Cargando sesiones…</p>}
    {query.error && <p role="alert">No se pudieron cargar las sesiones. <Button variant="link" onClick={() => void query.refetch()}>Reintentar</Button></p>}
    {query.data && !sessions.length && <p className="text-sm text-[var(--ink-2)]">Sin sesiones para estos filtros.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{sessions.map(session => <li key={session.id} className="space-y-2 rounded-lg border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><Link className="font-semibold hover:underline" href={`${sessionsPath}?session=${session.id}`}>{session.plan.title}</Link><span className="text-xs text-[var(--ink-2)]">{stateLabel(session.status)}</span></div>
      <p className="text-sm">{session.plan.symbols} · {session.plan.timeframe} · {session.plan.from} a {session.plan.to}</p>
      <p className="text-sm">{session.evidenceCount} operaciones · {session._count.practices} prácticas</p>
      <ul className="list-disc pl-5 text-sm">{session.plan.objectives.map((o, i) => <li key={i}>{o.title}</li>)}</ul>
      {!!session.reportNumber && <a className={textLink} href={pdfHref(session.id, session.reportNumber)}>Descargar PDF · v{session.reportNumber}</a>}
    </li>)}</ul>
    {query.hasNextPage && <Button size="sm" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Cargar más sesiones</Button>}
  </section>
}

function SessionDetail({ id, tradeId }: { id: string; tradeId?: string }) {
  const query = trpc.backtestSessions.get.useQuery({ id }, { refetchOnWindowFocus: false })
  const start = trpc.backtestSessions.start.useMutation()
  const reopen = trpc.backtestSessions.reopen.useMutation()
  const [version, setVersion] = useState<number | null>(null)
  const [transitionError, setTransitionError] = useState("")
  const session = query.data
  const selected = version ?? session?.reports[0]?.number ?? 0
  const report = trpc.backtestSessions.report.useQuery({ id, number: selected }, { enabled: selected > 0 && session?.status === "CLOSED" })
  if (!session) return <p role={query.error ? "alert" : "status"}>{query.error?.message ?? "Cargando sesión…"}</p>
  const updateStatus = async (action: "start" | "reopen") => {
    setTransitionError("")
    try { await (action === "start" ? start : reopen).mutateAsync({ id, revision: session.revision }); setVersion(null); await query.refetch() }
    catch (error) { setTransitionError(error instanceof Error ? error.message : "No se pudo actualizar la sesión.") }
  }
  return <div className="space-y-4">
    <section className={`${panel} space-y-2`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-semibold">{session.plan.title}</h2><span className="text-sm text-[var(--ink-2)]">{stateLabel(session.status)}</span></div>
      <p className="text-sm">{session.plan.symbols} · {session.plan.timeframe} · Mercado {session.plan.from} a {session.plan.to}</p>
      {session.plan.setup && <p className="text-sm">{session.plan.setup.name}{session.plan.setup.version ? ` · versión ${session.plan.setup.version}` : ""}{session.plan.setup.criterion ? ` · ${session.plan.setup.criterion}` : ""}</p>}
      <details><summary className="cursor-pointer text-sm font-medium">Consultar plan de la sesión</summary><p className="whitespace-pre-wrap text-sm">{session.plan.hypothesis}</p>
        {[["Entrada", session.plan.rules], ["Invalidación", session.plan.invalidation], ["Salida", session.plan.exitRules], ["Supuestos", session.plan.assumptions], ["Checklist", session.plan.setup?.checklist.join("\n")]].map(([label, content]) => content && <p key={label} className="whitespace-pre-wrap text-sm"><strong>{label}</strong> · {content}</p>)}
      </details>
      {session.status === "DRAFT" && <Button variant="primary" loading={start.isPending} onClick={() => void updateStatus("start")}>Iniciar con el plan guardado</Button>}
      {session.status === "CLOSED" && <Button loading={reopen.isPending} onClick={() => void updateStatus("reopen")}>Reabrir sesión</Button>}
      {transitionError && <p role="alert" className="text-sm text-[var(--loss)]">{transitionError}</p>}
    </section>
    {session.reports.length > 0 && <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Versiones del informe</h2>
      {session.status === "CLOSED" && <Label text="Consultar versión"><select className={selectClass} value={selected} onChange={e => setVersion(Number(e.target.value))}>{session.reports.map(row => <option key={row.number} value={row.number}>Versión {row.number}</option>)}</select></Label>}
      <ul className="space-y-1">{session.reports.map(row => <li key={row.number}><a className={textLink} href={pdfHref(id, row.number)}>Descargar PDF · versión {row.number}</a></li>)}</ul>
    </section>}
    {session.status === "DRAFT" && <PlanForm key={session.revision} initial={session} onSaved={async () => { await query.refetch() }} />}
    {session.status === "ACTIVE" && <SessionEditor initial={session} tradeId={tradeId} onClosed={async () => { await query.refetch() }} />}
    {session.status === "CLOSED" && report.isLoading && <p role="status">Cargando informe…</p>}
    {session.status === "CLOSED" && report.error && <p role="alert">{report.error.message}</p>}
    {session.status === "CLOSED" && report.data && <ClosedReport report={report.data} />}
  </div>
}

export function BacktestWorkspace({ sessionId, setupId, tradeId, createNew, criterion }: { sessionId?: string; setupId?: string; tradeId?: string; createNew: boolean; criterion?: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()
  return <main className="mx-auto w-full max-w-5xl space-y-4 pb-8">
    <div className="flex flex-wrap gap-4"><Link className={textLink} href="/aprendizaje?tab=practicas">Volver a Prácticas</Link>{(sessionId || createNew) && <Link className={textLink} href={sessionsPath}>Historial de sesiones</Link>}</div>
    <TopBar title="Sesiones de backtesting" subtitle="Planifica la prueba, documenta tus decisiones y conserva el informe de cierre." />
    {sessionId ? <SessionDetail key={sessionId} id={sessionId} tradeId={tradeId} /> : createNew ? <PlanForm key={setupId ?? "new"} setupId={setupId} criterion={criterion} onSaved={async id => { await utils.backtestSessions.list.invalidate(); router.push(`${sessionsPath}?session=${id}`) }} /> : <SessionList />}
  </main>
}
