// ─────────────────────────────────────────────────────────────────────────────
// Contratos de la recuperación semántica. Un adaptador por corpus aporta
// consultas LITERALES; el pipeline es genérico y único. Ver el spec
// docs/superpowers/specs/2026-07-23-recuperacion-semantica-coach-design.md §3.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * Corpus indexables. **Fuente única**: añadir uno aquí y registrar su adaptador.
 * El tipo se deriva de la tupla, y los `z.enum` de los routers y el `input_schema`
 * de la tool del Coach se construyen desde ella — no se repite la lista en ningún
 * otro sitio. Con dos corpus la duplicación era tolerable; con cinco es deriva
 * garantizada.
 */
export const CORPUS_KEYS = ["trade_notes", "trade_plans", "trade_events", "weekly_reviews", "setups", "learning_notes"] as const

export type CorpusKey = (typeof CORPUS_KEYS)[number]

/** Type guard para validar entrada externa (tool del Coach, query params). */
export function isCorpusKey(v: unknown): v is CorpusKey {
  return typeof v === "string" && (CORPUS_KEYS as readonly string[]).includes(v)
}

/**
 * Los 5 estados + OK. La regla vinculante (spec §6): sólo EMPTY_CORPUS y
 * NO_MATCHES pueden redactarse como ausencia. Los otros tres dicen
 * "no pude buscar", nunca "no hay".
 */
export type RetrievalState =
  | "OK"
  | "NO_KEY"
  | "EMBED_FAILED"
  | "NOT_INDEXED"
  | "EMPTY_CORPUS"
  | "NO_MATCHES"

/** Truncado del fragmento de nota. UNA sola constante: antes había deriva 200/240. */
export const SNIPPET_CHARS = 240
/** Tope de filas que la auto-reparación embebe por llamada. */
export const REPAIR_BATCH = 50
export const DEFAULT_LIMIT = 5
export const MAX_LIMIT = 10

export interface Citation {
  corpus:     CorpusKey
  id:         string
  label:      string          // "NQ · LONG" | título del recurso
  sublabel:   string          // "2026-07-21" | "LIBRO · EN_CURSO"
  outcome:    string          // "+2.1R · +$420" | "60% completado"
  positive:   boolean | null  // colorea el outcome; null = neutro
  snippet:    string
  similarity: number
  href:       string
}

export interface CorpusOutcome {
  corpus:    CorpusKey
  state:     RetrievalState
  /** Filas con texto y sin vector que siguen pendientes tras la reparación. */
  remaining: number
}

export interface SearchResult {
  citations: Citation[]
  /** Un estado POR corpus. Nunca se colapsan (spec §6). */
  outcomes:  CorpusOutcome[]
}

export interface IndexStatus {
  corpus:   CorpusKey
  /** Rótulo humano, tomado del adaptador: la UI no duplica nombres de corpus. */
  label:    string
  total:    number
  withText: number
  embedded: number
}

export interface Hit { id: string; similarity: number }
export interface PendingRow { id: string; text: string }
export interface CorpusCounts { total: number; withText: number; embedded: number }

/**
 * Un adaptador NO lleva lógica: aporta consultas literales y forma.
 * `vec` llega ya formateado como "[0.1,0.2,…]" — el formateo vive en el pipeline.
 */
export interface CorpusAdapter<Row = never> {
  key:   CorpusKey
  /** Etiqueta humana para /perfil. */
  label: string
  knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]>
  pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]>
  writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void>
  counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts>
  hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<Row[]>
  rowId(row: Row): string
  toCitation(row: Row, similarity: number): Citation
}
