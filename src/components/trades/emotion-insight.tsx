// EmotionInsight — the DELTA D10 incentive loop, made visible.
//
// When the trader tags a pre-trade emotion, this surfaces what that emotion has
// historically meant for THEM (win rate · sample · avg R). That immediate return
// is what closes C7: the datum pays off in the moment, so it gets logged.
// Renders nothing when there is no sufficient history (the server withholds it
// below the minimum sample — no misleading small-n claim).

import type { EmotionFeedback } from "@/domains/trading/services/emotion-feedback"

const LABELS: Record<string, string> = {
  calm: "en calma",
  anxious: "ansioso",
  excited: "eufórico",
  fearful: "con miedo",
  overconfident: "sobreconfiado",
}

export function EmotionInsight({ feedback }: { feedback: EmotionFeedback | null | undefined }) {
  if (!feedback) return null
  const label = LABELS[feedback.emotion] ?? feedback.emotion
  const tone = feedback.winRate >= 50 ? "var(--win)" : "var(--loss)"
  return (
    <div
      className="mt-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[11px] text-[var(--ink-2)]"
      role="note"
    >
      Entrando <strong className="text-[var(--ink)]">{label}</strong> tu win rate histórico es{" "}
      <strong style={{ color: tone }}>{feedback.winRate}%</strong> ·{" "}
      <span className="num">avgR {feedback.avgR.toFixed(2)}</span>{" "}
      <span className="text-[var(--ink-3)]">(n={feedback.n})</span>
    </div>
  )
}
