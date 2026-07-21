import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { persistInsights, toComputedInsight } from "@/domains/analytics/insights/insight-store"
import {
  detectIntradayDecay,
  detectRevengeTrading,
  detectOversizing,
  detectOffPlan,
} from "@/domains/analytics/services/insights-engine"
import { buildScenario, DIRTY_PROFILE } from "../support/behavior-scenario"
import { deriveCommitmentSpec, evaluateResult } from "@/domains/behavior/commitment-machine"
import { getVerifier, type WindowTrade } from "@/domains/behavior/verifiers"
import { planReinforcement } from "@/domains/behavior/reinforcement"
import { linkRule, NotEnforceableError } from "@/server/services/behavior/rule-suggestion-service"

const scenario = buildScenario(DIRTY_PROFILE)

/** Los 4 insights que el escenario debe producir, ya en forma persistible. */
function computed() {
  const engine = [
    detectIntradayDecay(scenario.history),
    detectRevengeTrading(scenario.history),
    detectOversizing(scenario.history),
    detectOffPlan(scenario.history),
  ].filter((i) => i !== null)
  return engine.map((i) => toComputedInsight(i!, scenario.history.length))
}

let userId: string
beforeEach(async () => {
  userId = await makeUser()
})
afterEach(async () => {
  await dropUser(userId)
})

describe("loop conductual (integración, Postgres real)", () => {
  it("el escenario produce los 4 insights y los persiste con su evento", async () => {
    const ci = computed()
    expect(ci).toHaveLength(4)

    const r = await persistInsights(userId, ci, prisma)
    expect(r.created).toBe(4)

    const rows = await prisma.insight.findMany({ where: { userId } })
    expect(rows.map((x) => x.type).sort()).toEqual(
      ["intraday-decay", "off-plan", "oversizing", "revenge-trading"],
    )
  })

  it("los eventos del outbox se ACUMULAN en pending (el dispatcher está des-agendado)", async () => {
    await persistInsights(userId, computed(), prisma)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(4)
    // El cron v3-dispatch-events lo des-agendó la migración 20260721190000 hasta que
    // exista el primer consumidor de S4. Los eventos se acumulan en vez de quemarse:
    // esa acumulación es el comportamiento correcto HOY, y esto la fija.
    for (const e of events) expect(e.status).toBe("pending")
  })

  it("cada insight persistido encadena hasta un refuerzo correctivo", async () => {
    await persistInsights(userId, computed(), prisma)
    const rows = await prisma.insight.findMany({ where: { userId } })

    for (const row of rows) {
      const spec = deriveCommitmentSpec(row.type)
      expect(spec).not.toBeNull()

      const { observedValue, evidence } = getVerifier(spec!.metricKey)!(
        scenario.history as WindowTrade[],
      )
      const result = evaluateResult(observedValue, spec!.target, spec!.comparator)
      expect(result).toBe("broken")
      expect(evidence.tradeIds.length).toBeGreaterThan(0)

      const plan = planReinforcement(result)
      expect(plan).toEqual({ kind: "corrective", visible: true })
    }
  })

  it("borrar el usuario cascadea insights y eventos", async () => {
    await persistInsights(userId, computed(), prisma)
    expect(await prisma.insight.count({ where: { userId } })).toBe(4)
    await dropUser(userId)
    expect(await prisma.insight.count({ where: { userId } })).toBe(0)
    expect(await prisma.domainEvent.count({ where: { userId } })).toBe(0)
    userId = await makeUser() // repuesto para que el afterEach no falle
  })
})

describe("commitment persistido y regla enlazada", () => {
  /** Crea la fila de commitment que deriva de un insight ya persistido. */
  async function commitFrom(insightId: string, type: string) {
    const spec = deriveCommitmentSpec(type)!
    const endAt = new Date()
    endAt.setDate(endAt.getDate() + 7) // ventana "week"
    return prisma.commitment.create({
      data: {
        userId,
        sourceInsightId: insightId,
        text: spec.text,
        metricKey: spec.metricKey,
        target: spec.target,
        comparator: spec.comparator,
        window: spec.window,
        endAt,
        createdVia: "self",
      },
    })
  }

  it("un insight persistido produce un commitment activo con su spec", async () => {
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "revenge-trading" } })

    const c = await commitFrom(insight.id, insight.type)
    expect(c.status).toBe("active")
    expect(c.metricKey).toBe("revengeTradesAfterLoss")
    expect(c.target).toBe(0)
    expect(c.comparator).toBe("<=")
    expect(c.sourceInsightId).toBe(insight.id)
  })

  it("linkRule respalda el commitment con una regla enforce y los enlaza en ambos sentidos", async () => {
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "revenge-trading" } })
    const c = await commitFrom(insight.id, insight.type)

    const rule = await linkRule(prisma, userId, c.id)

    expect(rule.mode).toBe("enforce")
    expect(rule.trigger).toBe("TRADE_PRE_CREATE")
    expect(rule.sourceCommitmentId).toBe(c.id)
    expect(rule.sourceInsightId).toBe(insight.id) // hereda el origen del commitment

    const updated = await prisma.commitment.findUniqueOrThrow({ where: { id: c.id } })
    expect(updated.ruleId).toBe(rule.id) // enlace en el otro sentido
  })

  it("los 3 tipos prevenibles pre-trade se respaldan con regla", async () => {
    await persistInsights(userId, computed(), prisma)
    for (const type of ["intraday-decay", "revenge-trading", "oversizing"]) {
      const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type } })
      const c = await commitFrom(insight.id, type)
      const rule = await linkRule(prisma, userId, c.id)
      expect(rule.mode).toBe("enforce")
    }
    expect(await prisma.rule.count({ where: { userId } })).toBe(3)
  })

  it("off-plan NO es prevenible pre-trade y linkRule lo rechaza explícitamente", async () => {
    // Por diseño: off-plan se conoce al etiquetar el trade, no antes de abrirlo.
    // Un "enforce" ahí sería falsa protección (R3), así que el servicio se niega.
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "off-plan" } })
    const c = await commitFrom(insight.id, "off-plan")

    await expect(linkRule(prisma, userId, c.id)).rejects.toBeInstanceOf(NotEnforceableError)
    expect(await prisma.rule.count({ where: { userId } })).toBe(0)
  })
})
