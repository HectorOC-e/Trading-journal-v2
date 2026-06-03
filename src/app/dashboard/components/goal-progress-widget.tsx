"use client"

// TASK-050: Goal-setting dashboard widget with circular progress rings
// P1.3: Goal exceeded visual feedback (Sprint 6)

import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type KpiSummary = RouterOutputs["trades"]["dashboardStats"]["kpis"]

interface GoalProgressWidgetProps {
  kpis: KpiSummary
  weeklyTradesCount?: number
}

function CircleProgress({ pct, color, exceeded, size = 52 }: {
  pct:      number
  color:    string
  exceeded: boolean
  size?:    number
}) {
  const radius = (size - 6) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - Math.min(1, pct) * circ
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--line)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition:  "stroke-dashoffset .4s ease",
          filter:      exceeded ? `drop-shadow(0 0 4px ${color})` : undefined,
        }} />
    </svg>
  )
}

interface GoalRingProps {
  label:    string
  value:    string
  pct:      number
  color:    string
  sub?:     string
  exceeded: boolean
  exceededBy?: string
}

function GoalRing({ label, value, pct, color, sub, exceeded, exceededBy }: GoalRingProps) {
  const clampedPct = Math.min(1, Math.max(0, pct))
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 80 }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <CircleProgress pct={clampedPct} color={color} exceeded={exceeded} size={52} />
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: exceeded ? color : clampedPct >= 1 ? color : "var(--ink)",
        }}>
          {exceeded ? "✓" : `${Math.round(clampedPct * 100)}%`}
        </span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: exceeded ? color : "var(--ink)", textAlign: "center" }}>{value}</p>
      <p style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center" }}>{label}</p>
      {exceeded && exceededBy && (
        <p style={{ fontSize: 9, fontWeight: 700, color, textAlign: "center", letterSpacing: "0.02em" }}>
          +{exceededBy} extra
        </p>
      )}
      {!exceeded && sub && <p style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center" }}>{sub}</p>}
    </div>
  )
}

export function GoalProgressWidget({ kpis, weeklyTradesCount = 0 }: GoalProgressWidgetProps) {
  const { data: goals } = trpc.goals.get.useQuery()

  if (!goals) return null

  const { weeklyTradesGoal, weeklyPnlGoal } = goals
  const hasAnyGoal = weeklyTradesGoal != null || weeklyPnlGoal != null

  if (!hasAnyGoal) {
    return (
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: "var(--radius)", padding: "20px 24px",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Metas semanales</p>
        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
          Sin metas configuradas.{" "}
          <a href="/perfil" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Configúralas en tu perfil →
          </a>
        </p>
      </div>
    )
  }

  const tradesGoalPct = weeklyTradesGoal != null && weeklyTradesGoal > 0
    ? weeklyTradesCount / weeklyTradesGoal
    : 0
  const pnlGoalPct = weeklyPnlGoal != null && weeklyPnlGoal > 0
    ? kpis.pnlWeek / weeklyPnlGoal
    : 0

  const rings: GoalRingProps[] = []

  const tradesExceeded = weeklyTradesGoal != null && weeklyTradesCount > weeklyTradesGoal
  const pnlExceeded    = weeklyPnlGoal    != null && kpis.pnlWeek     > weeklyPnlGoal

  if (weeklyTradesGoal != null) {
    const extraTrades = tradesExceeded ? weeklyTradesCount - weeklyTradesGoal : 0
    rings.push({
      label:      "Trades semana",
      value:      `${weeklyTradesCount}/${weeklyTradesGoal}`,
      pct:        tradesGoalPct,
      color:      tradesGoalPct >= 1 ? "var(--win)" : "var(--accent)",
      exceeded:   tradesExceeded,
      exceededBy: tradesExceeded ? String(extraTrades) : undefined,
    })
  }

  if (weeklyPnlGoal != null) {
    const pnlValue = kpis.pnlWeek
    const extraPnl = pnlExceeded ? pnlValue - weeklyPnlGoal : 0
    rings.push({
      label:      "P&L semanal",
      value:      `${pnlValue >= 0 ? "+" : ""}$${Math.abs(pnlValue).toFixed(0)}`,
      pct:        Math.max(0, pnlGoalPct),
      color:      pnlGoalPct >= 1 ? "var(--win)" : pnlGoalPct < 0 ? "var(--loss)" : "var(--accent)",
      sub:        `meta $${weeklyPnlGoal}`,
      exceeded:   pnlExceeded,
      exceededBy: pnlExceeded ? `$${extraPnl.toFixed(0)}` : undefined,
    })
  }

  // disciplineGoal ring suppressed until real weekly discipline score is available in KpiSummary
  // learningPct ring suppressed until learning-minutes tracking query is implemented

  const anyExceeded = rings.some(r => r.exceeded)

  return (
    <div style={{
      background:   "var(--panel)",
      border:       anyExceeded ? "1px solid var(--win)" : "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding:      "20px 24px",
      transition:   "border-color .3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: anyExceeded ? 8 : 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Metas semanales</p>
        <a href="/perfil" style={{ fontSize: 10.5, color: "var(--accent)", textDecoration: "none" }}>
          Editar metas →
        </a>
      </div>

      {anyExceeded && (
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           6,
          marginBottom:  14,
          padding:       "6px 10px",
          borderRadius:  "var(--radius-sm)",
          background:    "rgba(34,197,94,0.1)",
          border:        "1px solid rgba(34,197,94,0.25)",
        }}>
          <span style={{ fontSize: 13 }}>🎯</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--win)" }}>
            ¡Meta(s) superada(s) esta semana!
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "space-around", flexWrap: "wrap" }}>
        {rings.map(r => <GoalRing key={r.label} {...r} />)}
      </div>
    </div>
  )
}
