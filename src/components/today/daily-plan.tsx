"use client"

import Link from "next/link"
import type { AccountStat } from "@/domains/analytics/services/dashboard-analytics"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { formatCalendarDate } from "@/lib/datetime/local"

const dayLabel = (day: string) => formatCalendarDate(day, { day: "2-digit", month: "short" })
const timingLabel = { overdue: "Pendiente anterior", today: "Hoy", upcoming: "Próxima" }

function PlanGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-[var(--radius-sm)] border border-[var(--line)] p-3"><h3 className="text-xs font-semibold mb-2">{title}</h3><div className="space-y-2 text-xs text-[var(--ink-2)]">{children}</div></div>
}

/** Independent from dashboard analytics and the cognitive signals feed. */
export function DailyPlan({ accountStats }: { accountStats?: Pick<AccountStat, "accountId" | "risk">[] } = {}) {
  const { data, isLoading, isError, refetch } = trpc.today.plan.useQuery(undefined, { staleTime: 60_000 })
  return (
    <section aria-label="Plan del día" className="mb-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 text-[var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold">Plan del día</h2>
        {data && <span className="text-xs text-[var(--ink-3)]">{dayLabel(data.today)} · {data.timezone}</span>}
      </div>
      {isLoading ? <p role="status" className="text-xs text-[var(--ink-3)]">Cargando plan…</p> : isError || !data ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-xs"><p>No se pudo cargar el plan del día.</p><Button size="sm" onClick={() => void refetch()}>Reintentar plan</Button></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PlanGroup title="Compromisos vigentes">
              {data.commitments.length ? data.commitments.map(c => <div key={c.id}><Link href={c.href} className="block hover:underline"><span className="font-medium">{c.title}</span><span className="block text-[var(--ink-3)]">{dayLabel(c.start)} – {dayLabel(c.end)}</span></Link>{c.reviewHref && <Link href={c.reviewHref} className="block text-[var(--accent)] hover:underline">Ver review de origen</Link>}</div>) : <p>Sin compromisos vigentes.</p>}
            </PlanGroup>
            <PlanGroup title="Revisar riesgo">
              {data.accounts.length ? data.accounts.map(a => {
                const risk = accountStats?.find(s => s.accountId === a.id)?.risk
                return <div key={a.id}>
                  <Link href={a.href} className="block text-[var(--accent)] hover:underline">{a.name} · Ver cuenta</Link>
                  {a.locked && <p className="text-[var(--loss)]" title={a.lockReason}>Bloqueada</p>}
                  {risk?.breach && <p className="text-[var(--loss)]">En riesgo</p>}
                  <p className="text-[var(--ink-3)]">{risk ? risk.daily.configured ? `Pérdida diaria: ${risk.daily.actualPct}% / límite ${risk.daily.limitPct}%` : "Sin límite diario configurado" : "Revisar límites del día"}</p>
                </div>
              }) : <p>Sin cuentas reales activas.</p>}
            </PlanGroup>
            <PlanGroup title="Repasos pendientes">
              {data.resources.length ? data.resources.map(r => <Link key={r.id} href={r.href} className="block hover:underline"><span className="font-medium">{r.title}</span><span className="block text-[var(--ink-3)]">{r.reason}</span></Link>) : <p>Sin repasos pendientes.</p>}
            </PlanGroup>
            <PlanGroup title="Sesiones programadas">
              {data.sessions.length ? data.sessions.map(s => <div key={s.id}><Link href={s.href} className="block hover:underline"><span className="font-medium">{s.title}</span><span className="block text-[var(--ink-3)]">{timingLabel[s.timing]} · {dayLabel(s.date)}{s.minutes != null ? ` · ${s.minutes} min` : ""}</span></Link>{s.reviewHref && <Link href={s.reviewHref} className="block text-[var(--accent)] hover:underline">Ver review de origen</Link>}</div>) : <p>Sin sesiones programadas.</p>}
            </PlanGroup>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-[var(--ink-3)]">Esta semana: {data.practices.sessions} prácticas · {data.practices.minutes} min registrados</p>
            <Link href={data.practices.href} className="text-[var(--accent)] font-medium hover:underline focus-visible:outline-2">Registrar práctica</Link>
          </div>
        </>
      )}
    </section>
  )
}
