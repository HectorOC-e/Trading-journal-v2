// ─────────────────────────────────────────────────────────────────────────────
// Pre-session check-in (S8, C7/#30, E12) — a deliberate go/no-go BEFORE trading.
// mood/energy/sleep on 1–5; a red verdict recommends NOT trading. Pure scoring so
// it's deterministic and testable (the persistence/UI lives in the service/page).
// ─────────────────────────────────────────────────────────────────────────────

export type CheckinVerdict = "go" | "caution" | "no_go"

export interface CheckinInput {
  mood: number // 1..5
  energy: number // 1..5
  sleep: number // 1..5
}

export interface CheckinResult {
  verdict: CheckinVerdict
  score: number // mean of the three, 1..5
  reasons: string[]
  recommendation: string
}

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)))
const LABEL: Record<keyof CheckinInput, string> = { mood: "ánimo", energy: "energía", sleep: "descanso" }

/**
 * Score a pre-session check-in. Any single dimension at its floor (1) forces a
 * `no_go` (one critical red is enough); otherwise the mean decides: ≤2 → no_go,
 * ≤3 → caution, else go. A `no_go` recommends not trading (#30).
 */
export function checkinVerdict(raw: CheckinInput): CheckinResult {
  const mood = clamp(raw.mood), energy = clamp(raw.energy), sleep = clamp(raw.sleep)
  const dims = { mood, energy, sleep }
  const score = (mood + energy + sleep) / 3

  const reasons = (Object.keys(dims) as (keyof CheckinInput)[])
    .filter((k) => dims[k] <= 2)
    .map((k) => `${LABEL[k]} bajo (${dims[k]}/5)`)

  const anyCritical = mood === 1 || energy === 1 || sleep === 1
  let verdict: CheckinVerdict
  if (anyCritical || score <= 2) verdict = "no_go"
  else if (score <= 3) verdict = "caution"
  else verdict = "go"

  const recommendation =
    verdict === "no_go"
      ? "Hoy no es un buen día para operar. Si lo haces, reduce el tamaño al mínimo y opera solo lo más A+ — o mejor, descansa."
      : verdict === "caution"
        ? "Opera con cautela: reduce el riesgo y limítate a tus mejores setups."
        : "Estás en buen estado para operar tu plan."

  return { verdict, score, reasons, recommendation }
}
