import { describe, it, expect } from "vitest"
import { classify } from "@/server/services/retrieval/classify"

const base = { hasKey: true, embedOk: true, withText: 10, embedded: 10, hits: 3 }

describe("classify — taxonomia de recuperacion", () => {
  it("sin clave gana sobre todo lo demas", () => {
    expect(classify({ ...base, hasKey: false })).toBe("NO_KEY")
    expect(classify({ hasKey: false, embedOk: false, withText: 0, embedded: 0, hits: 0 })).toBe("NO_KEY")
  })

  it("fallo de embedding gana sobre el estado del corpus", () => {
    expect(classify({ ...base, embedOk: false })).toBe("EMBED_FAILED")
    expect(classify({ ...base, embedOk: false, withText: 0 })).toBe("EMBED_FAILED")
  })

  it("sin texto escrito es EMPTY_CORPUS, no NOT_INDEXED", () => {
    expect(classify({ ...base, withText: 0, embedded: 0, hits: 0 })).toBe("EMPTY_CORPUS")
  })

  // ── EL test del sprint: el estado exacto de produccion hoy ──────────────────
  it("con texto y CERO vectores dice NOT_INDEXED, jamas NO_MATCHES", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 0, hits: 0 })).toBe("NOT_INDEXED")
  })

  it("indexado a medias y sin hits dice NOT_INDEXED: no se busco en todo", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 2, hits: 0 })).toBe("NOT_INDEXED")
  })

  it("indexado del todo y sin hits es la UNICA ausencia real", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 4, hits: 0 })).toBe("NO_MATCHES")
  })

  it("con hits es OK aunque queden filas sin indexar", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 10, embedded: 6, hits: 2 })).toBe("OK")
  })
})
