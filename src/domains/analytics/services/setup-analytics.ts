import type { MinimalTrade } from "./dashboard-analytics"

export type SetupMeta = {
  id:    string
  name:  string
  abbr:  string
  color: string
}

export type SetupStats = {
  setupId:             string
  name:                string
  abbr:                string
  color:               string
  trades:              number
  winRate:             number
  avgR:                number
  cumR:                number
  netPnl:              number
  equityCurve:         number[]
  aplusCount:          number
  currentStreak:       number
  aplusComplianceRate: number | null  // % trades with all checklist items checked
}

export type SessionMatrixRow = {
  setupId:  string
  session:  string
  trades:   number
  winRate:  number | null
}

export type DirectionStats = {
  setupId:    string
  longCount:  number
  longWr:     number
  longAvgR:   number
  shortCount: number
  shortWr:    number
  shortAvgR:  number
}

// ── computeSetupStats ─────────────────────────────────────────────────────────

// checklistMap: tradeId → { checked: number; total: number }
export function computeSetupStats(
  setupId:      string,
  trades:       MinimalTrade[],
  meta?:        SetupMeta,
  checklistMap?: Map<string, { checked: number; total: number }>,
): SetupStats {
  const st     = trades.filter(t => t.setupId === setupId)
  const sWins  = st.filter(t => t.pnl > 0).length
  const sWithR = st.filter(t => t.rMultiple != null)
  const sAvgR  = sWithR.length > 0 ? sWithR.reduce((s, t) => s + t.rMultiple!, 0) / sWithR.length : 0
  const cumR   = st.reduce((s, t) => s + (t.rMultiple ?? 0), 0)
  const netPnl = st.reduce((s, t) => s + t.pnl, 0)
  const aplusCount = st.filter(t => t.tags.includes("A+")).length

  let cum = 0
  const equityCurve = st.map(t => { cum += t.pnl; return parseFloat(cum.toFixed(2)) })
  if (equityCurve.length === 0) { equityCurve.push(0, 0) }
  else if (equityCurve.length === 1) { equityCurve.unshift(0) }

  const descSorted = [...st].sort((a, b) => b.date.localeCompare(a.date))
  let currentStreak = 0
  for (const t of descSorted) { if (t.pnl > 0) currentStreak++; else break }

  let aplusComplianceRate: number | null = null
  if (checklistMap && checklistMap.size > 0) {
    const withChecklist = st.filter(t => checklistMap.has(t.id))
    if (withChecklist.length > 0) {
      const compliant = withChecklist.filter(t => {
        const r = checklistMap.get(t.id)!
        return r.total > 0 && r.checked === r.total
      })
      aplusComplianceRate = parseFloat((compliant.length / withChecklist.length * 100).toFixed(1))
    }
  }

  return {
    setupId,
    name:          meta?.name  ?? setupId,
    abbr:          meta?.abbr  ?? "??",
    color:         meta?.color ?? "#4f6ef7",
    trades:        st.length,
    winRate:       parseFloat((st.length > 0 ? sWins / st.length * 100 : 0).toFixed(1)),
    avgR:          parseFloat(sAvgR.toFixed(2)),
    cumR:          parseFloat(cumR.toFixed(1)),
    netPnl:        parseFloat(netPnl.toFixed(2)),
    equityCurve,
    aplusCount,
    currentStreak,
    aplusComplianceRate,
  }
}

// ── computeSessionMatrix ──────────────────────────────────────────────────────

const SESSIONS = ["New York", "London", "Asia", "London Close"] as const

export function computeSessionMatrix(
  setups: SetupMeta[],
  trades: MinimalTrade[],
): SessionMatrixRow[] {
  const result: SessionMatrixRow[] = []
  for (const setup of setups.slice(0, 6)) {
    const sTrades = trades.filter(t => t.setupId === setup.id)
    for (const sess of SESSIONS) {
      const sessT = sTrades.filter(t => t.session === sess)
      result.push({
        setupId:  setup.id,
        session:  sess,
        trades:   sessT.length,
        winRate:  sessT.length > 0
          ? parseFloat((sessT.filter(t => t.pnl > 0).length / sessT.length * 100).toFixed(2))
          : null,
      })
    }
  }
  return result
}

// ── computeDirectionBreakdown ─────────────────────────────────────────────────

export function computeDirectionBreakdown(
  setupId: string,
  trades:  MinimalTrade[],
): DirectionStats | null {
  const longs  = trades.filter(t => t.setupId === setupId && t.direction === "LONG")
  const shorts = trades.filter(t => t.setupId === setupId && t.direction === "SHORT")
  if (longs.length === 0 || shorts.length === 0) return null

  const dWr = (arr: MinimalTrade[]) => arr.length > 0 ? arr.filter(t => t.pnl > 0).length / arr.length * 100 : 0
  const dAr = (arr: MinimalTrade[]) => arr.length > 0 ? arr.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / arr.length : 0

  return {
    setupId,
    longCount:  longs.length,  longWr:  dWr(longs),  longAvgR:  dAr(longs),
    shortCount: shorts.length, shortWr: dWr(shorts), shortAvgR: dAr(shorts),
  }
}
