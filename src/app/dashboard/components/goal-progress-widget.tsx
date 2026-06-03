"use client"

// TASK-050: Goal-setting dashboard widget with circular progress rings

import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type KpiSummary = RouterOutputs["trades"]["dashboardStats"]["kpis"]

interface GoalProgressWidgetProps {
  kpis: KpiSummary
  weeklyTradesCount?: number
}

function CircleProgress({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
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
        style={{ transition: "stroke-dashoffset .4s ease" }} />
    </svg>
  )
}

interface GoalRingProps {
  label:  string
  value:  string
  pct:    number
  color:  string
  sub?:   string
}

function GoalRing({ label, value, pct, color, sub }: GoalRingProps) {
  const clampedPct = Math.min(1, Math.max(0, pct))
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 80 }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <CircleProgress pct={clampedPct} color={color} size={52} />
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: clampedPct >= 1 ? color : "var(--ink)",
        }}>
          {Math.round(clampedPct * 100)}%
        </span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", textAlign: "center" }}>{value}</p>
      <p style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center" }}>{label}</p>
      {sub && <p style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center" }}>{sub}</p>}
    </div>
  )
}

export function GoalProgressWidget({ kpis, weeklyTradesCount = 0 }: GoalProgressWidgetProps) {
  const { data: goals } = trpc.goals.get.useQuery()

  if (!goals) return null

  const { disciplineGoal, weeklyTradesGoal, weeklyPnlGoal, weeklyGoalMinutes } = goals
  const hasAnyGoal = disciplineGoal != null || weeklyTradesGoal != null || weeklyPnlGoal != null || weeklyGoalMinutes != null

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

  const tradesGoalPct    = weeklyTradesGoal != null && weeklyTradesGoal > 0 ? weeklyTradesCount / weeklyTradesGoal : 0
  const pnlGoalPct       = weeklyPnlGoal    != null && weeklyPnlGoal > 0    ? kpis.pnlMonth / weeklyPnlGoal : 0
  const disciplinePct    = disciplineGoal   != null && disciplineGoal > 0   ? Math.min(1, 80 / disciplineGoal) : 0
  // weeklyGoalMinutes uses a placeholder — real learning minutes require a separate query
  const learningPct      = weeklyGoalMinutes != null && weeklyGoalMinutes > 0 ? 0 : 0

  const rings: GoalRingProps[] = []

  if (weeklyTradesGoal != null) {
    rings.push({
      label: "Trades semana",
      value: `${weeklyTradesCount}/${weeklyTradesGoal}`,
      pct:   tradesGoalPct,
      color: tradesGoalPct >= 1 ? "var(--win)" : "var(--accent)",
    })
  }

  if (weeklyPnlGoal != null) {
    const pnlValue = kpis.pnlMonth
    rings.push({
      label: "P&L semanal",
      value: `$${Math.abs(pnlValue).toFixed(0)}${pnlValue < 0 ? " (loss)" : ""}`,
      pct:   Math.max(0, pnlGoalPct),
      color: pnlGoalPct >= 1 ? "var(--win)" : pnlGoalPct < 0 ? "var(--loss)" : "var(--accent)",
      sub:   `meta $${weeklyPnlGoal}`,
    })
  }

  if (disciplineGoal != null) {
    rings.push({
      label: "Disciplina",
      value: `${disciplineGoal}% meta`,
      pct:   disciplinePct,
      color: disciplinePct >= 1 ? "var(--win)" : "var(--accent)",
    })
  }

  if (weeklyGoalMinutes != null) {
    rings.push({
      label: "Aprendizaje",
      value: `0/${weeklyGoalMinutes} min`,
      pct:   learningPct,
      color: "var(--accent)",
    })
  }

  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Metas semanales</p>
        <a href="/perfil" style={{ fontSize: 10.5, color: "var(--accent)", textDecoration: "none" }}>
          Editar metas →
        </a>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-around", flexWrap: "wrap" }}>
        {rings.map(r => <GoalRing key={r.label} {...r} />)}
      </div>
    </div>
  )
}
