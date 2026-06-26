import { describe, it, expect } from "vitest"
import {
  isInjectable,
  proposeMemory,
  assembleContextBlock,
  parseMemoryExtraction,
} from "@/domains/cognitive/coach/memory"

describe("memory frontier (FREEZE-D9 / ADR-003)", () => {
  it("only confirmed memory is injectable", () => {
    expect(isInjectable({ status: "confirmed" })).toBe(true)
    expect(isInjectable({ status: "candidate" })).toBe(false)
    expect(isInjectable({ status: "refuted" })).toBe(false)
  })

  it("proposeMemory always yields a candidate written by the llm (never confirmed)", () => {
    const m = proposeMemory("fact", "  opera mejor por la mañana  ", "t1")
    expect(m.status).toBe("candidate")
    expect(m.source).toBe("llm")
    expect(m.content).toBe("opera mejor por la mañana")
    expect(m.sourceThreadId).toBe("t1")
    expect(isInjectable(m)).toBe(false) // a freshly proposed memory is NOT injectable
  })
})

describe("assembleContextBlock (Context Assembler, FREEZE-D10)", () => {
  it("returns empty when there is nothing to inject", () => {
    expect(assembleContextBlock({ confirmedMemories: [], commitments: [] })).toBe("")
  })

  it("includes identity, active commitments, confirmed facts and the prior summary", () => {
    const block = assembleContextBlock({
      identity: "disciplinado pero impaciente",
      commitments: [{ text: "Máx 2 trades/día", status: "active" }],
      confirmedMemories: [{ kind: "fact", content: "pierde en rango" }],
      lastSummary: "hablamos de su over-trading",
    })
    expect(block).toContain("## MEMORIA DEL COACH")
    expect(block).toContain("disciplinado pero impaciente")
    expect(block).toContain("Máx 2 trades/día")
    expect(block).toContain("(active)")
    expect(block).toContain("pierde en rango")
    expect(block).toContain("hablamos de su over-trading")
  })

  it("keeps identity + commitments and truncates confirmed facts under a tight budget", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: "fact", content: `hecho número ${i} con bastante texto para ocupar espacio` }))
    const block = assembleContextBlock(
      { identity: "id", commitments: [{ text: "C", status: "active" }], confirmedMemories: many },
      { maxChars: 300 },
    )
    expect(block).toContain("Identidad del trader: id")
    expect(block).toContain('"C" (active)')
    expect(block).toMatch(/\(\+\d+ más\)/) // some facts were dropped
  })
})

describe("parseMemoryExtraction (S6 producer)", () => {
  it("parses summary + capped candidate facts from clean JSON", () => {
    const r = parseMemoryExtraction('{"summary":"over-trading los lunes","facts":[{"kind":"fact","content":"pierde en rango"},{"kind":"preference","content":"prefiere London"}]}')
    expect(r.summary).toBe("over-trading los lunes")
    expect(r.facts).toHaveLength(2)
    expect(r.facts[1].kind).toBe("preference")
  })
  it("extracts JSON embedded in prose and caps facts at 5", () => {
    const facts = Array.from({ length: 8 }, (_, i) => `{"kind":"fact","content":"h${i}"}`).join(",")
    const r = parseMemoryExtraction(`Claro:\n{"summary":"x","facts":[${facts}]}\nfin`)
    expect(r.facts).toHaveLength(5)
  })
  it("defaults unknown kind to fact and returns empty on garbage", () => {
    expect(parseMemoryExtraction('{"facts":[{"kind":"weird","content":"y"}]}').facts[0].kind).toBe("fact")
    expect(parseMemoryExtraction("no json here")).toEqual({ summary: null, facts: [] })
  })
})
