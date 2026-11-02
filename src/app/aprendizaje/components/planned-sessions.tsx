"use client"

import { trpc } from '@/lib/trpc/client'
import { useLearningCalendar } from '../hooks/use-learning-calendar'
import { PlannedSessionActions } from './planned-session-actions'

/** Plans are calendar dates, so formatting must never shift them into another day. */
function formatPlanDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

export function PlannedSessions() {
  const { today } = useLearningCalendar()
  const query = trpc.studySessions.plans.useInfiniteQuery({ limit: 20 }, {
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const plans = query.data?.pages.flatMap(page => page.items) ?? []

  return <section aria-label="Tus planes" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
    <h2 className="text-sm font-semibold text-[var(--ink)]">Tus planes</h2>
    {query.error && <div role="alert" className="mt-3 text-sm text-[var(--ink-2)]">
      <p>No se pudieron actualizar tus planes.{query.data ? ' Se muestran los últimos datos disponibles.' : ''}</p>
      <button onClick={() => void query.refetch()} className="mt-2 text-[var(--accent)] underline">Reintentar planes</button>
    </div>}
    {query.isLoading && !query.data ? <p className="mt-3 text-sm text-[var(--ink-3)]">Cargando planes…</p> :
      !query.error && plans.length === 0 ? <p className="mt-3 text-sm text-[var(--ink-3)]">No tienes sesiones planificadas.</p> : null}
    {plans.length > 0 && <ul className="mt-3 divide-y divide-[var(--line)]">
      {plans.map(plan => <li key={plan.id} className="flex flex-col gap-2 py-3 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--ink)]">{plan.resourceTitle}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]">
            <time dateTime={plan.date}>{formatPlanDate(plan.date)}</time>
            {today && plan.date < today && <span className="font-semibold text-[var(--loss)]">Atrasado</span>}
          </div>
        </div>
        <PlannedSessionActions plan={{ id: plan.id, resourceId: plan.resourceId, title: plan.resourceTitle, date: plan.date, plannedMin: plan.plannedMin ?? 0 }}/>
      </li>)}
    </ul>}
    {query.hasNextPage && <button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} className="mt-3 text-xs text-[var(--accent)] underline disabled:opacity-50">
      {query.isFetchingNextPage ? 'Cargando más planes…' : 'Cargar más planes'}
    </button>}
  </section>
}
