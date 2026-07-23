// Añadir un corpus = añadir su adaptador aquí. La guarda de contrato
// (__tests__/services/retrieval/registry.test.ts) falla si el adaptador está
// incompleto o registrado bajo la clave equivocada.
import type { CorpusAdapter, CorpusKey } from "./types"
import { tradeNotesAdapter } from "./corpora/trade-notes"
import { tradePlansAdapter } from "./corpora/trade-plans"
import { tradeEventNotesAdapter } from "./corpora/trade-event-notes"
import { weeklyReviewNotesAdapter } from "./corpora/weekly-review-notes"
import { monthlyReviewNotesAdapter } from "./corpora/monthly-review-notes"
import { setupNotesAdapter } from "./corpora/setup-notes"
import { resourceNotesAdapter } from "./corpora/resource-notes"

export const CORPORA = {
  trade_notes:     tradeNotesAdapter,
  trade_plans:     tradePlansAdapter,
  trade_events:    tradeEventNotesAdapter,
  weekly_reviews:  weeklyReviewNotesAdapter,
  monthly_reviews: monthlyReviewNotesAdapter,
  setups:          setupNotesAdapter,
  learning_notes:  resourceNotesAdapter,
} as unknown as Record<CorpusKey, CorpusAdapter<never>>

export function getAdapter(key: CorpusKey): CorpusAdapter<never> {
  const a = CORPORA[key]
  if (!a) throw new Error(`Corpus desconocido: ${key}`)
  return a
}
