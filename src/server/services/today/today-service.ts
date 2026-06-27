// ─────────────────────────────────────────────────────────────────────────────
// HOY service (S13) — aggregates every cognitive signal into ONE prioritized feed
// (assembleTodayFeed): open insights, active commitments, rule suggestions,
// reinforcements, the daily anomaly (#44) and the primary account's risk budget.
// Read-only; deterministic (P2). Surfaces on HOY (dashboard).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { assembleTodayFeed, detectDailyAnomaly, type SignalInput, type TodayItem, type SignalSeverity } from "@/domains/cognitive/today/feed"
import { getRiskOverview } from "@/server/services/risk/risk-service"
import type { RiskBudget } from "@/domains/analytics/risk/risk-budget"
import { isPracticeType } from "@/domains/trading/account-reality"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))
const iso = (d: Date) => d.toISOString()

function insightSeverity(s: string): SignalSeverity {
  return s === "critical" ? "critical" : s === "warning" ? "warning" : "info"
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.round(p * (sortedAsc.length - 1))))
  return sortedAsc[idx]
}

export interface TodayFeedResult {
  feed: TodayItem[]
  budget: RiskBudget | null
  primaryAccountId: string | null
}

export async function getTodayFeed(prisma: PrismaClient, userId: string): Promise<TodayFeedResult> {
  const [insights, commitments, suggestions, reinforcements, accounts] = await Promise.all([
    prisma.insight.findMany({
      where: { userId, status: "active" },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, title: true, detail: true, severity: true, lastSeenAt: true, createdAt: true },
      take: 12,
    }),
    prisma.commitment.findMany({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true, createdAt: true },
      take: 8,
    }),
    prisma.ruleSuggestion.findMany({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      select: { id: true, reason: true, createdAt: true },
      take: 6,
    }),
    prisma.reinforcement.findMany({
      where: { userId, visible: true, channel: "today" },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, createdAt: true },
      take: 4,
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, type: true, status: true },
    }),
  ])

  const signals: SignalInput[] = []

  for (const i of insights) {
    signals.push({
      id: `insight:${i.id}`,
      kind: "insight",
      severity: insightSeverity(i.severity),
      title: i.title,
      body: i.detail ?? undefined,
      cta: { label: "Comprometerme", href: "/analytics" },
      createdAt: iso(i.lastSeenAt ?? i.createdAt),
    })
  }
  for (const c of commitments) {
    signals.push({ id: `commitment:${c.id}`, kind: "commitment", severity: "info", title: c.text, cta: { label: "Ver loop", href: "/analytics" }, createdAt: iso(c.createdAt) })
  }
  for (const s of suggestions) {
    signals.push({ id: `suggestion:${s.id}`, kind: "suggestion", severity: "warning", title: s.reason || "Regla sugerida para protegerte", cta: { label: "Activar regla", href: "/analytics" }, createdAt: iso(s.createdAt) })
  }
  for (const r of reinforcements) {
    signals.push({ id: `reinforcement:${r.id}`, kind: "reinforcement", severity: r.kind === "positive" ? "positive" : "info", title: r.kind === "positive" ? "Vas bien — protégelo." : "Una ventana se cerró: ajusta y sigue.", createdAt: iso(r.createdAt) })
  }

  // Primary real account for anomaly + risk budget.
  const realActive = accounts.filter((a) => !isPracticeType(a.type) && a.status === "ACTIVE")
  const primary = realActive[0] ?? null

  let budget: RiskBudget | null = null
  if (primary) {
    const trades = await prisma.trade.findMany({
      where: { userId, accountId: primary.id, status: "CLOSED" },
      select: { pnl: true, date: true },
    })
    // Anomaly (#44): today vs the historical daily distribution.
    const byDate = new Map<string, { count: number; pnl: number }>()
    for (const t of trades) {
      const key = t.date.toISOString().slice(0, 10)
      const e = byDate.get(key) ?? { count: 0, pnl: 0 }
      e.count++
      e.pnl += num(t.pnl) ?? 0
      byDate.set(key, e)
    }
    const days = [...byDate.values()]
    const today = new Date().toISOString().slice(0, 10)
    const todayStat = byDate.get(today) ?? { count: 0, pnl: 0 }
    if (days.length >= 3 && todayStat.count > 0) {
      const meanDailyTrades = days.reduce((s, d) => s + d.count, 0) / days.length
      const losses = days.map((d) => Math.max(0, -d.pnl)).sort((a, b) => a - b)
      const anomaly = detectDailyAnomaly({
        tradesToday: todayStat.count,
        meanDailyTrades,
        lossToday: Math.max(0, -todayStat.pnl),
        p90DailyLoss: percentile(losses, 0.9),
      })
      for (const [j, msg] of anomaly.messages.entries()) {
        signals.push({ id: `anomaly:${today}:${j}`, kind: "anomaly", severity: "warning", title: msg, cta: { label: "Check-in", href: "/psicologia" }, createdAt: iso(new Date()) })
      }
    }

    const overview = await getRiskOverview(prisma, userId, primary.id)
    budget = overview?.budget ?? null
    if (budget?.hasLimit && (budget.exhausted || (budget.usedPct ?? 0) >= 0.8)) {
      signals.push({
        id: `risk:${primary.id}`,
        kind: "risk",
        severity: budget.exhausted ? "critical" : "warning",
        title: budget.exhausted ? "Presupuesto de riesgo del día agotado" : "Margen de riesgo del día bajo",
        body: budget.exhausted ? "Operar más acerca el bloqueo por pérdida diaria." : `Quedan ~${budget.maxTrades} trades de tamaño habitual.`,
        cta: { label: "Ver cuenta", href: "/cuentas" },
        createdAt: iso(new Date()),
      })
    }
  }

  return { feed: assembleTodayFeed(signals), budget, primaryAccountId: primary?.id ?? null }
}
