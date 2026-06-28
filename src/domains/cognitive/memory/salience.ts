// ─────────────────────────────────────────────────────────────────────────────
// Episodic-memory salience (E13, v3.2 §6). Each episode carries a salience that
// (a) starts higher for more memorable events and (b) DECAYS with age — so the
// coach recalls what mattered and recent, not everything. recallScore blends
// salience with semantic similarity to rank what to surface. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryEventType =
  | "intervention" | "commitment_broken" | "checkin_red" | "commitment_kept"
  | "streak" | "trade_emotional" | "manual"

// Base salience by event type — in-the-moment errors and broken commitments are
// the most memorable; routine emotional trades the least.
const BASE: Record<MemoryEventType, number> = {
  intervention: 0.9,
  commitment_broken: 0.85,
  checkin_red: 0.7,
  manual: 0.7,
  commitment_kept: 0.6,
  streak: 0.6,
  trade_emotional: 0.5,
}

const DEFAULT_BASE = 0.5
const DEFAULT_HALFLIFE_DAYS = 30

export function initialSalience(type: MemoryEventType): number {
  return BASE[type] ?? DEFAULT_BASE
}

/** Exponential decay of salience with age (half-life in days). */
export function decayedSalience(initial: number, ageDays: number, halfLifeDays = DEFAULT_HALFLIFE_DAYS): number {
  const age = Math.max(0, ageDays)
  return Math.max(0, initial * Math.exp((-Math.LN2 * age) / halfLifeDays))
}

const SALIENCE_WEIGHT = 0.4
const SIMILARITY_WEIGHT = 0.6

/** Rank an episode for recall: blend its (decayed) salience with kNN similarity. */
export function recallScore(input: { salience: number; similarity: number }): number {
  const s = Math.min(1, Math.max(0, input.salience))
  const sim = Math.min(1, Math.max(0, input.similarity))
  return SALIENCE_WEIGHT * s + SIMILARITY_WEIGHT * sim
}
