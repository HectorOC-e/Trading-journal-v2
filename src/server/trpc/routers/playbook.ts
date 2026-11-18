// Playbook router (S10) — read-only setup intelligence: edge decay (#12),
// definition-vs-execution drift (#32), edge-evolution curve (#21), redefinition
// before/after (#50). Deterministic (P2); UI surfaces in S12.

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { getSetupPlaybook } from "@/server/services/setups/playbook-service"
import {
  getSetupValidationEvidence,
  getSetupValidationHistory,
  getSetupValidationOverview,
  getValidationPolicy,
} from "@/server/services/setups/validation-service"
import { validateValidationTransition, type ValidationStage } from "@/domains/analytics/setups/validation"
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client"
import { emitNotification } from "@/server/services/notifications/emit"

const setupIdentity = z.object({ setupId: z.string().uuid() })
const mode = z.enum(["REAL", "DEMO", "BACKTEST"])
const stage = z.enum(["HYPOTHESIS", "BACKTEST", "DEMO", "REAL"])
const action = z.enum(["PROMOTE", "KEEP_REVIEWING", "SUSPEND", "RESUME", "RETURN_TO_REVIEW"])
const percentage = z.number().int().min(0).max(100)
const positiveCount = z.number().int().min(1).max(100_000)

const policyUpdate = setupIdentity.extend({
  expectedVersion: z.number().int().positive(),
  backtestMinClosed: positiveCount.optional(),
  backtestMinRCoveragePct: percentage.optional(),
  backtestMinChecklistCoveragePct: percentage.optional(),
  backtestRequirePositiveExpectancy: z.boolean().optional(),
  demoMinClosed: positiveCount.optional(),
  demoMinDistinctWeeks: z.number().int().min(1).max(5_200).optional(),
  demoMinChecklistCompliancePct: percentage.optional(),
  demoRequirePositiveExpectancy: z.boolean().optional(),
  realMonitorMinClosed: positiveCount.optional(),
  realMonitorMinDistinctWeeks: z.number().int().min(1).max(5_200).optional(),
}).refine((input) => Object.keys(input).some((key) => !["setupId", "expectedVersion"].includes(key)), "No hay cambios que guardar.")

const decisionInput = setupIdentity.extend({
  idempotencyKey: z.string().uuid(),
  action,
  targetStage: stage,
  expectedPolicyVersion: z.number().int().positive(),
  expectedCurrentStage: stage,
  note: z.string().trim().max(2_000).default(""),
  exceptionReason: z.string().trim().min(10).max(1_000).nullable().optional(),
})

function notFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "La estrategia no está disponible." })
}

function modeForStage(value: ValidationStage) {
  return value === "HYPOTHESIS" ? null : value
}

const stageLabel: Record<ValidationStage, string> = {
  HYPOTHESIS: "Hipótesis",
  BACKTEST: "Backtesting",
  DEMO: "Demo",
  REAL: "Real",
}

const nextStage: Partial<Record<ValidationStage, ValidationStage>> = {
  HYPOTHESIS: "BACKTEST",
  BACKTEST: "DEMO",
  DEMO: "REAL",
}

export const playbookRouter = router({
  setup: protectedProcedure
    .input(z.object({ setupId: z.string().uuid(), scope: z.enum(["REAL", "DEMO", "BACKTEST"]).default("REAL") }))
    .query(({ ctx, input }) => getSetupPlaybook(ctx.prisma, ctx.userId, input.setupId, input.scope)),

  validationOverview: protectedProcedure
    .input(setupIdentity)
    .query(async ({ ctx, input }) => await getSetupValidationOverview(ctx.prisma, ctx.userId, input.setupId) ?? notFound()),

  validationEvidence: protectedProcedure
    .input(setupIdentity.extend({ mode }))
    .query(async ({ ctx, input }) => await getSetupValidationEvidence(ctx.prisma, ctx.userId, input.setupId, input.mode) ?? notFound()),

  validationPolicy: protectedProcedure
    .input(setupIdentity)
    .query(async ({ ctx, input }) => await getValidationPolicy(ctx.prisma, ctx.userId, input.setupId) ?? notFound()),

  validationHistory: protectedProcedure
    .input(setupIdentity)
    .query(async ({ ctx, input }) => await getSetupValidationHistory(ctx.prisma, ctx.userId, input.setupId) ?? notFound()),

  syncValidationNotifications: protectedProcedure
    .input(setupIdentity.extend({ evidenceSignature: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const overview = await getSetupValidationOverview(ctx.prisma, ctx.userId, input.setupId)
      if (!overview) notFound()
      const currentStage = overview.state.currentStage as ValidationStage
      const evidence = currentStage === "HYPOTHESIS" ? overview.hypothesis : overview.stages[currentStage]
      if (evidence.signature !== input.evidenceSignature) {
        throw new TRPCError({ code: "CONFLICT", message: "La evidencia cambió. Actualiza la ruta antes de sincronizar avisos." })
      }

      const href = `/playbook?highlight=${input.setupId}`
      const dedupeKey = `setup-validation:${input.setupId}:${currentStage}:${evidence.verdict}:${evidence.signature}`
      if (evidence.verdict === "ELIGIBLE" && currentStage !== "REAL") {
        const target = nextStage[currentStage]
        if (!target) return { emitted: false }
        const notification = await emitNotification(ctx.prisma, ctx.userId, "SETUP_STAGE_ELIGIBLE", {
          params: { name: overview.setup.name, stage: stageLabel[currentStage], nextStage: stageLabel[target] },
          sourceId: input.setupId,
          href,
          dedupeKey,
        })
        return { emitted: notification !== null }
      }
      if (evidence.verdict === "WARNING") {
        const warnings = "warnings" in evidence ? evidence.warnings : []
        const warning = warnings.includes("EDGE_DECAY") && warnings.includes("DEFINITION_DRIFT")
          ? "deterioro del edge y desvío de definición"
          : warnings.includes("EDGE_DECAY")
            ? "deterioro del edge"
            : "desvío de definición"
        const notification = await emitNotification(ctx.prisma, ctx.userId, "SETUP_VALIDATION_WARNING", {
          params: { name: overview.setup.name, stage: stageLabel[currentStage], warning },
          sourceId: input.setupId,
          href,
          dedupeKey,
        })
        return { emitted: notification !== null }
      }
      return { emitted: false }
    }),

  updateValidationPolicy: protectedProcedure
    .input(policyUpdate)
    .mutation(async ({ ctx, input }) => {
      const current = await getValidationPolicy(ctx.prisma, ctx.userId, input.setupId)
      if (!current) notFound()
      if (current.version !== input.expectedVersion) {
        throw new TRPCError({ code: "CONFLICT", message: "Los criterios cambiaron. Actualiza antes de guardar." })
      }
      const { setupId, expectedVersion, ...data } = input
      const updated = await ctx.prisma.setupValidationPolicy.updateMany({
        where: { id: current.id, userId: ctx.userId, setupId, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      })
      if (updated.count !== 1) {
        throw new TRPCError({ code: "CONFLICT", message: "Los criterios cambiaron. Actualiza antes de guardar." })
      }
      return ctx.prisma.setupValidationPolicy.findFirst({ where: { id: current.id, userId: ctx.userId } })
    }),

  createValidationDecision: protectedProcedure
    .input(decisionInput)
    .mutation(({ ctx, input }) => ctx.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM public.setups
        WHERE id = ${input.setupId}::uuid AND user_id = ${ctx.userId}::uuid
        FOR UPDATE
      `
      if (!locked.length) notFound()

      const existing = await tx.setupValidationDecision.findFirst({
        where: { userId: ctx.userId, idempotencyKey: input.idempotencyKey },
      })
      if (existing) {
        const equivalent = existing.setupId === input.setupId
          && existing.action === input.action
          && existing.fromStage === input.expectedCurrentStage
          && existing.toStage === input.targetStage
          && existing.note === input.note
          && (existing.exceptionReason ?? null) === (input.exceptionReason ?? null)
        if (!equivalent) {
          throw new TRPCError({ code: "CONFLICT", message: "Esta solicitud ya se utilizó para otra decisión." })
        }
        return existing
      }

      const transactionalPrisma = tx as unknown as PrismaClient
      const overview = await getSetupValidationOverview(transactionalPrisma, ctx.userId, input.setupId)
      if (!overview) notFound()
      if (overview.policy.version !== input.expectedPolicyVersion) {
        throw new TRPCError({ code: "CONFLICT", message: "Los criterios cambiaron. Revisa la evidencia actual." })
      }
      if (overview.state.currentStage !== input.expectedCurrentStage) {
        throw new TRPCError({ code: "CONFLICT", message: "La ruta cambió. Revisa su etapa actual." })
      }
      const transition = validateValidationTransition(overview.state, input.action, input.targetStage)
      if (!transition.valid) throw new TRPCError({ code: "BAD_REQUEST", message: transition.reason })

      const currentStage = overview.state.currentStage as ValidationStage
      const currentMode = modeForStage(currentStage)
      const evidence = currentMode ? overview.stages[currentMode] : overview.hypothesis
      if (input.action === "PROMOTE" && evidence.verdict !== "ELIGIBLE" && !input.exceptionReason) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Explica por qué deseas avanzar con criterios pendientes." })
      }
      const signature = currentMode ? overview.stages[currentMode].signature : overview.hypothesis.signature
      const evidenceSnapshot = {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        setup: overview.setup,
        fromStage: currentStage,
        toStage: input.targetStage,
        verdict: evidence.verdict,
        evidence,
        policy: {
          version: overview.policy.version,
          backtestMinClosed: overview.policy.backtestMinClosed,
          backtestMinRCoveragePct: overview.policy.backtestMinRCoveragePct,
          backtestMinChecklistCoveragePct: overview.policy.backtestMinChecklistCoveragePct,
          demoMinClosed: overview.policy.demoMinClosed,
          demoMinDistinctWeeks: overview.policy.demoMinDistinctWeeks,
          demoMinChecklistCompliancePct: overview.policy.demoMinChecklistCompliancePct,
          realMonitorMinClosed: overview.policy.realMonitorMinClosed,
          realMonitorMinDistinctWeeks: overview.policy.realMonitorMinDistinctWeeks,
        },
      }
      return tx.setupValidationDecision.create({
        data: {
          userId: ctx.userId,
          setupId: input.setupId,
          fromStage: currentStage,
          toStage: input.targetStage,
          action: input.action,
          mode: currentMode,
          policyVersion: overview.policy.version,
          evidenceSnapshot: evidenceSnapshot as Prisma.InputJsonValue,
          evidenceSignature: signature,
          note: input.note,
          exceptionReason: input.exceptionReason ?? null,
          idempotencyKey: input.idempotencyKey,
        },
      })
    })),
})
