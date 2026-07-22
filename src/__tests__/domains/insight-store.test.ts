import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/domains/cognitive/events/event-bus", () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}))

import { toComputedInsight, persistInsights } from "@/domains/analytics/insights/insight-store"
import type { ComputedInsight } from "@/domains/analytics/insights/insight-reconcile"
import type { Insight } from "@/domains/analytics/services/insights-engine"
import type { PrismaClient } from "@/lib/generated/prisma/client"

const base: Insight = {
  id: "intraday-decay",
  category: "risk",
  severity: "warning",
  title: "Tu WR cae en la 3ª operación",
  detail: "...",
  evidence: "n=40",
  recommendation: "Para tras 2 trades",
  metric: 42,
}

describe("toComputedInsight — engine insight → persisted shape", () => {
  it("uses the stable engine id as the fingerprint", () => {
    expect(toComputedInsight(base, 40).fingerprint).toBe("intraday-decay")
  })

  it("carries the real sample size and leaves Bayesian fields undefined without a stat basis (ADR-002)", () => {
    const c = toComputedInsight(base, 40)
    expect(c.sampleSize).toBe(40)
    expect(c.confidence).toBeUndefined()
    expect(c.credibleIntervalLow).toBeUndefined()
    expect(c.effectSize).toBeUndefined()
  })

  it("fills Bayesian fields from the estimator when the detector exposes a stat basis (S3)", () => {
    const withStat: Insight = {
      ...base,
      stat: { kind: "proportion", successes: 5, trials: 20, baseline: 0.6, direction: "below" },
    }
    const c = toComputedInsight(withStat, 40)
    // sampleSize refines to the detector's own n; confidence is the directional posterior.
    expect(c.sampleSize).toBe(20)
    expect(c.confidence).toBeGreaterThan(0.95)
    expect(c.credibleIntervalLow).toBeGreaterThanOrEqual(0)
    expect(c.credibleIntervalHigh).toBeLessThanOrEqual(1)
    expect(c.credibleIntervalLow! < c.credibleIntervalHigh!).toBe(true)
    expect(c.effectSize).toBeLessThan(0) // observed rate below baseline
  })

  it("passes through narrative fields and records the source detector", () => {
    const c = toComputedInsight(base, 40)
    expect(c).toMatchObject({
      type: "intraday-decay",
      category: "risk",
      severity: "warning",
      title: "Tu WR cae en la 3ª operación",
      recommendation: "Para tras 2 trades",
      metric: 42,
    })
  })
})
// ─────────────────────────────────────────────────────────────────────────────
// Un insight que sobrevive a un recompute se "tocaba" actualizando SÓLO
// lastSeenAt, así que su contenido quedaba congelado en el primer cálculo:
//   · la métrica y el n del badge envejecían en silencio (un off-plan detectado
//     al 23.9 % seguía diciendo 23.9 % con el trader al 50 %),
//   · y un detector corregido no alcanzaba jamás a quien ya tenía el insight.
// Medido en aria: tras corregir `setup-concentration`, el recompute devolvió
// {created:0, touched:10} y la recomendación errónea siguió intacta en la fila.
// ─────────────────────────────────────────────────────────────────────────────
function computed(fp: string, over: Partial<ComputedInsight> = {}): ComputedInsight {
  return {
    fingerprint: fp, type: fp, category: "pattern", severity: "info",
    title: `t-${fp}`, detail: "d", evidence: "e", sampleSize: 20, ...over,
  }
}

function mockClient(existing: { id: string; fingerprint: string; status: string }[]) {
  const updates: { where: { id: string }; data: Record<string, unknown> }[] = []
  const tx = {
    insight: {
      create:     vi.fn().mockResolvedValue({ id: "created-1" }),
      updateMany: vi.fn((args: { data: Record<string, unknown>; where: { id: { in: string[] } } }) => {
        for (const id of args.where.id.in) updates.push({ where: { id }, data: args.data })
        return Promise.resolve({ count: args.where.id.in.length })
      }),
      update: vi.fn((args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(args)
        return Promise.resolve({})
      }),
    },
  }
  const client = {
    insight: { findMany: vi.fn().mockResolvedValue(existing) },
    $transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx),
  } as unknown as PrismaClient
  return { client, updates }
}

describe("persistInsights — un insight vivo refleja la medida de hoy", () => {
  it("refresca el contenido de los insights tocados, no sólo lastSeenAt", async () => {
    const { client, updates } = mockClient([
      { id: "row-1", fingerprint: "setup-concentration", status: "active" },
    ])
    const nuevo = computed("setup-concentration", {
      severity: "warning",
      title: "\"A\" concentra tus aciertos, pero \"B\" es el que deja dinero",
      recommendation: "No subas tamaño en \"A\" todavía",
      metric: 61.5,
      sampleSize: 67,
    })
    const r = await persistInsights("u1", [nuevo], client)

    expect(r.touched).toBe(1)
    expect(r.created).toBe(0)
    const u = updates.find((x) => x.where.id === "row-1")
    expect(u).toBeDefined()
    expect(u!.data.title).toBe(nuevo.title)
    expect(u!.data.severity).toBe("warning")
    expect(u!.data.recommendation).toBe(nuevo.recommendation)
    expect(u!.data.metric).toBe(61.5)
    expect(u!.data.sampleSize).toBe(67)
    expect(u!.data.lastSeenAt).toBeInstanceOf(Date)
  })

  it("refresca también la estadística bayesiana cuando cambia el n", async () => {
    const { client, updates } = mockClient([
      { id: "row-2", fingerprint: "intraday-decay", status: "active" },
    ])
    await persistInsights("u1", [computed("intraday-decay", {
      sampleSize: 40, confidence: 0.99, credibleIntervalLow: 0.2, credibleIntervalHigh: 0.7,
    })], client)

    const u = updates.find((x) => x.where.id === "row-2")!
    expect(u.data.sampleSize).toBe(40)
    expect(u.data.confidence).toBe(0.99)
    expect(u.data.credibleIntervalLow).toBe(0.2)
  })

  it("no toca la identidad ni el estado de la fila", async () => {
    const { client, updates } = mockClient([
      { id: "row-3", fingerprint: "off-plan", status: "active" },
    ])
    await persistInsights("u1", [computed("off-plan")], client)

    const u = updates.find((x) => x.where.id === "row-3")!
    expect(u.data.fingerprint).toBeUndefined()
    expect(u.data.status).toBeUndefined()
    expect(u.data.createdAt).toBeUndefined()
  })
})
