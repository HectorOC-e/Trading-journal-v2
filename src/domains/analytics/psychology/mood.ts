// ─────────────────────────────────────────────────────────────────────────────
// Longitudinal mood/energy (S8, C7) — rolling averages of pre-session mood/energy
// over time + a simple trend verdict (improving/declining/stable). Reuses the C3
// rolling-window primitive (S0). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { rollingWindow, type Dated } from "../longitudinal/rolling-window"

export interface MoodSample {
  date: string // YYYY-MM-DD
  mood?: number | null
  energy?: number | null
}

export interface MoodWindow {
  from: string
  to: string
  count: number
  avgMood: number | null
  avgEnergy: number | null
}

export type MoodTrend = "improving" | "declining" | "stable" | "insufficient"

export interface MoodTrendResult {
  windows: MoodWindow[]
  trend: MoodTrend
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

/**
 * Rolling average of mood/energy. `windowCount` items per window, stepping by
 * `step`. Trend compares the first vs last window's avg mood (±0.3 = stable).
 */
export function moodTrend(samples: MoodSample[], opts: { windowCount?: number; step?: number } = {}): MoodTrendResult {
  const windowCount = opts.windowCount ?? 5
  const step = opts.step ?? 1
  const series: Dated<MoodSample>[] = samples.map((s) => ({ date: s.date, value: s }))

  const windows = rollingWindow(series, {
    size: { count: windowCount },
    step,
    agg: (items): { avgMood: number | null; avgEnergy: number | null } => ({
      avgMood: avg(items.map((i) => i.value.mood).filter((n): n is number => n != null)),
      avgEnergy: avg(items.map((i) => i.value.energy).filter((n): n is number => n != null)),
    }),
  }).map((w) => ({ from: w.from, to: w.to, count: w.count, avgMood: w.value.avgMood, avgEnergy: w.value.avgEnergy }))

  if (windows.length < 2) return { windows, trend: "insufficient" }

  const first = windows[0].avgMood
  const last = windows[windows.length - 1].avgMood
  if (first == null || last == null) return { windows, trend: "insufficient" }
  const delta = last - first
  const trend: MoodTrend = delta > 0.3 ? "improving" : delta < -0.3 ? "declining" : "stable"
  return { windows, trend }
}
