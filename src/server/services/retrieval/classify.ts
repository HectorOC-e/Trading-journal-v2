import type { RetrievalState } from "./types"

export interface ClassifyInput {
  hasKey:   boolean
  embedOk:  boolean
  withText: number
  embedded: number
  hits:     number
}

/**
 * El orden de las guardas ES la semántica.
 *
 * La distinción que este sprint existe para hacer: cuando hay texto pero faltan
 * vectores, la respuesta honesta es NOT_INDEXED ("no pude buscar en todo"), no
 * NO_MATCHES ("no hay nada parecido"). Colapsarlas es lo que hacía que el Coach
 * afirmara "no has anotado nada sobre eso" sobre un trader que sí había anotado.
 */
export function classify(input: ClassifyInput): RetrievalState {
  if (!input.hasKey)  return "NO_KEY"
  if (!input.embedOk) return "EMBED_FAILED"
  if (input.withText === 0) return "EMPTY_CORPUS"
  if (input.embedded === 0) return "NOT_INDEXED"
  if (input.hits > 0) return "OK"
  // Sin hits: sólo es ausencia real si se buscó sobre TODO el texto escrito.
  if (input.embedded < input.withText) return "NOT_INDEXED"
  return "NO_MATCHES"
}
