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
  maxConsecutiveLosses: number        // longest losing streak
  avgHoldTimeMinutes:   number | null // avg minutes between openTime and closeTime
  bestSession:          string | null // session with highest WR (min 3 trades)
  bestDayOfWeek:        number | null // 0=Mon..6=Sun with highest WR (min 3 trades)
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

// ── helpers ───────────────────────────────────────────────────────────────────

/** Parse "HH:MM" string and return minutes from midnight, or null if invalid. */
function parseTimeMinutes(s: string | null | undefined): number | null {
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
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

  // ── maxConsecutiveLosses ──────────────────────────────────────────────────
  // iterate chronological order (st is already sorted asc by date from router)
  let maxConsecLosses = 0
  let curLossStreak   = 0
  for (const t of st) {
    if (t.pnl < 0) {
      curLossStreak++
      if (curLossStreak > maxConsecLosses) maxConsecLosses = curLossStreak
    } else {
      curLossStreak = 0
    }
  }

  // ── avgHoldTimeMinutes ────────────────────────────────────────────────────
  let holdSum   = 0
  let holdCount = 0
  for (const t of st) {
    const open  = parseTimeMinutes(t.openTime)
    const close = parseTimeMinutes(t.closeTime)
    if (open !== null && close !== null) {
      // handle overnight: if close < open, add 1440 (24h)
      const diff = close >= open ? close - open : close - open + 1440
      holdSum  += diff
      holdCount++
    }
  }
  const avgHoldTimeMinutes = holdCount > 0 ? parseFloat((holdSum / holdCount).toFixed(1)) : null

  // ── bestSession ───────────────────────────────────────────────────────────
  const sessionMap = new Map<string, { wins: number; total: number }>()
  for (const t of st) {
    if (!t.session) continue
    const row = sessionMap.get(t.session) ?? { wins: 0, total: 0 }
    row.total++
    if (t.pnl > 0) row.wins++
    sessionMap.set(t.session, row)
  }
  let bestSession: string | null = null
  let bestSessionWr = -Infinity
  for (const [sess, { wins, total }] of sessionMap.entries()) {
    if (total < 3) continue
    const wr = wins / total
    if (wr > bestSessionWr) { bestSessionWr = wr; bestSession = sess }
  }

  // ── bestDayOfWeek ─────────────────────────────────────────────────────────
  // date field is "YYYY-MM-DD"; JS Date.getDay() returns 0=Sun..6=Sat, remap to 0=Mon..6=Sun
  const dowMap = new Map<number, { wins: number; total: number }>()
  for (const t of st) {
    const d = new Date(t.date + "T12:00:00Z") // noon UTC avoids DST off-by-one
    const jsDay = d.getUTCDay()               // 0=Sun
    const monBased = jsDay === 0 ? 6 : jsDay - 1  // 0=Mon..6=Sun
    const row = dowMap.get(monBased) ?? { wins: 0, total: 0 }
    row.total++
    if (t.pnl > 0) row.wins++
    dowMap.set(monBased, row)
  }
  let bestDayOfWeek: number | null = null
  let bestDowWr = -Infinity
  for (const [dow, { wins, total }] of dowMap.entries()) {
    if (total < 3) continue
    const wr = wins / total
    if (wr > bestDowWr) { bestDowWr = wr; bestDayOfWeek = dow }
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
    maxConsecutiveLosses: maxConsecLosses,
    avgHoldTimeMinutes,
    bestSession,
    bestDayOfWeek,
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
