import { createHash } from "node:crypto"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { OperationalMode } from "@/domains/trading/operational-mode"
import {
  DEFAULT_VALIDATION_POLICY,
  deriveValidationState,
  evaluateValidationStage,
  type StageEvidence,
  type ValidationAction,
  type ValidationDecisionLike,
  type ValidationPolicy,
  type ValidationStage,
} from "@/domains/analytics/setups/validation"
import { detectEdgeDecay } from "@/domains/analytics/setups/edge-decay"
import { detectSetupDrift } from "@/domains/analytics/setups/drift"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"

const ALGORITHM_VERSION = "strategy-validation-v1"
const MODES: OperationalMode[] = ["BACKTEST", "DEMO", "REAL"]

const num = (value: { toString(): string } | number | null | undefined) =>
  value == null ? null : Number(value)

type OwnedSetup = {
  id: string
  userId: string
  name: string
  market: string
  direction: string
  description: string
  expectedWr: { toString(): string } | number | null
  expectedAvgR: { toString(): string } | number | null
  aplusChecklist: string[]
  standardChecklist: string[]
  updatedAt: Date
  edgeUpdatedAt: Date | null
}

type PolicyRow = ValidationPolicy & {
  id: string
  userId: string
  setupId: string
  criteria: unknown
  createdAt: Date
  updatedAt: Date
}

export type PracticeValidationContext = {
  executedPractices: number
  reviewPractices: number
  captures: number
}

export type SetupValidationEvidence = StageEvidence & {
  practiceContext: PracticeValidationContext
  intelligence: { decay: string; drift: string }
  signature: string
}

function domainDecision<T extends { action: string; fromStage: string; toStage: string }>(decision: T) {
  return decision as Omit<T, "action" | "fromStage" | "toStage"> & {
    action: ValidationAction
    fromStage: ValidationStage
    toStage: ValidationStage
  }
}

const setupSelect = {
  id: true,
  userId: true,
  name: true,
  market: true,
  direction: true,
  description: true,
  expectedWr: true,
  expectedAvgR: true,
  aplusChecklist: true,
  standardChecklist: true,
  updatedAt: true,
  edgeUpdatedAt: true,
} as const

function domainPolicy(row: PolicyRow): ValidationPolicy {
  return {
    version: row.version,
    backtestMinClosed: row.backtestMinClosed,
    backtestMinRCoveragePct: row.backtestMinRCoveragePct,
    backtestMinChecklistCoveragePct: row.backtestMinChecklistCoveragePct,
    backtestRequirePositiveExpectancy: row.backtestRequirePositiveExpectancy,
    demoMinClosed: row.demoMinClosed,
    demoMinDistinctWeeks: row.demoMinDistinctWeeks,
    demoMinChecklistCompliancePct: row.demoMinChecklistCompliancePct,
    demoRequirePositiveExpectancy: row.demoRequirePositiveExpectancy,
    realMonitorMinClosed: row.realMonitorMinClosed,
    realMonitorMinDistinctWeeks: row.realMonitorMinDistinctWeeks,
  }
}

async function ownedContext(prisma: PrismaClient, userId: string, setupId: string) {
  const setup = await prisma.setup.findFirst({ where: { id: setupId, userId }, select: setupSelect }) as OwnedSetup | null
  if (!setup) return null
  const row = await prisma.setupValidationPolicy.upsert({
    where: { userId_setupId: { userId, setupId } },
    create: { userId, setupId, ...DEFAULT_VALIDATION_POLICY, criteria: {} },
    update: {},
  }) as PolicyRow
  return { setup, row, policy: domainPolicy(row) }
}

export async function getValidationPolicy(prisma: PrismaClient, userId: string, setupId: string) {
  const context = await ownedContext(prisma, userId, setupId)
  return context?.row ?? null
}

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

export function buildValidationEvidenceSignature(evidence: unknown, policyVersion: number) {
  return createHash("sha256").update(JSON.stringify(canonical({
    algorithmVersion: ALGORITHM_VERSION,
    policyVersion,
    evidence,
  }))).digest("hex")
}

function stageForMode(mode: OperationalMode): ValidationStage {
  if (mode === "BACKTEST") return "BACKTEST"
  if (mode === "DEMO") return "DEMO"
  return "REAL"
}

async function evidenceForContext(
  prisma: PrismaClient,
  userId: string,
  setup: OwnedSetup,
  policy: ValidationPolicy,
  mode: OperationalMode,
): Promise<SetupValidationEvidence> {
  const trades = await prisma.trade.findMany({
    where: {
      ...await scopedTradeWhere(prisma, userId, { mode, includeArchived: true }),
      setupId: setup.id,
      status: "CLOSED",
    },
    orderBy: [{ date: "asc" }, { closeTime: "asc" }, { createdAt: "asc" }],
    select: { id: true, date: true, rMultiple: true, pnl: true, direction: true, updatedAt: true },
  })
  const tradeIds = trades.map((trade) => trade.id)
  const checklistRows = tradeIds.length ? await prisma.tradeChecklistResult.findMany({
    where: { userId, tradeId: { in: tradeIds } },
    select: { tradeId: true, itemsChecked: true, itemsTotal: true },
  }) : []
  const checklist = new Map(checklistRows.map((row) => [row.tradeId, {
    checked: row.itemsChecked.length,
    total: row.itemsTotal,
  }]))
  const practiceRows = tradeIds.length ? await prisma.practiceTradeLink.findMany({
    where: { userId, tradeId: { in: tradeIds }, practice: { operationalMode: mode } },
    select: {
      role: true,
      tradeId: true,
      practice: { select: { id: true, kind: true, updatedAt: true, attachments: { select: { id: true } } } },
    },
  }) : []

  const rValues = trades.map((trade) => num(trade.rMultiple)).filter((value): value is number => value !== null && Number.isFinite(value))
  const recent = rValues.slice(-20)
  const baseline = rValues.slice(0, -20)
  const decay = detectEdgeDecay({
    recent,
    baseline: baseline.length >= 2 ? baseline : null,
    definedAvgR: num(setup.expectedAvgR),
  })
  const drift = detectSetupDrift({
    definition: {
      direction: setup.direction === "LONG" || setup.direction === "SHORT" ? setup.direction : "AMBAS",
      expectedWr: num(setup.expectedWr),
      expectedAvgR: num(setup.expectedAvgR),
    },
    trades: trades.map((trade) => ({
      direction: trade.direction === "SHORT" ? "SHORT" : "LONG",
      rMultiple: num(trade.rMultiple),
      pnl: Math.sign(num(trade.pnl) ?? 0),
    })),
  })
  const evidence = evaluateValidationStage({
    stage: stageForMode(mode),
    policy,
    definition: {
      market: setup.market,
      direction: setup.direction,
      description: setup.description,
      expectedAvgR: num(setup.expectedAvgR),
      checklistItemCount: setup.aplusChecklist.length + setup.standardChecklist.length,
    },
    trades: trades.map((trade) => ({ id: trade.id, date: trade.date, rMultiple: num(trade.rMultiple) })),
    checklist,
    signals: { decay: decay.status, drift: drift.status },
  })
  const executedPractices = new Set(practiceRows.filter((row) => row.role === "EXECUTED").map((row) => row.practice.id)).size
  const reviewPractices = new Set(practiceRows.filter((row) => row.role === "REVIEWED").map((row) => row.practice.id)).size
  const captures = new Set(practiceRows.flatMap((row) => row.practice.attachments.map((attachment) => attachment.id))).size
  const practiceContext = { executedPractices, reviewPractices, captures }
  const source = {
    schemaVersion: 1,
    setup: { id: setup.id, updatedAt: setup.updatedAt, edgeUpdatedAt: setup.edgeUpdatedAt },
    mode,
    trades: trades.map((trade) => ({ id: trade.id, updatedAt: trade.updatedAt })).sort((a, b) => a.id.localeCompare(b.id)),
    checklist: checklistRows.map((row) => ({ tradeId: row.tradeId, itemsChecked: [...row.itemsChecked].sort(), itemsTotal: row.itemsTotal })).sort((a, b) => a.tradeId.localeCompare(b.tradeId)),
    practices: practiceRows.map((row) => ({
      id: row.practice.id,
      role: row.role,
      updatedAt: row.practice.updatedAt,
      attachments: row.practice.attachments.map((attachment) => attachment.id).sort(),
    })).sort((a, b) => a.id.localeCompare(b.id) || a.role.localeCompare(b.role)),
    evidence,
    practiceContext,
  }
  return {
    ...evidence,
    practiceContext,
    intelligence: { decay: decay.status, drift: drift.status },
    signature: buildValidationEvidenceSignature(source, policy.version),
  }
}

export async function getSetupValidationEvidence(
  prisma: PrismaClient,
  userId: string,
  setupId: string,
  mode: OperationalMode,
) {
  const context = await ownedContext(prisma, userId, setupId)
  if (!context) return null
  return evidenceForContext(prisma, userId, context.setup, context.policy, mode)
}

export async function getSetupValidationHistory(prisma: PrismaClient, userId: string, setupId: string) {
  const owned = await prisma.setup.findFirst({ where: { id: setupId, userId }, select: { id: true } })
  if (!owned) return null
  const history = await prisma.setupValidationDecision.findMany({
    where: { userId, setupId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return history.map(domainDecision)
}

export async function getSetupValidationOverview(
  prisma: PrismaClient,
  userId: string,
  setupId: string,
) {
  const context = await ownedContext(prisma, userId, setupId)
  if (!context) return null
  const evidence = await Promise.all(MODES.map((mode) => evidenceForContext(prisma, userId, context.setup, context.policy, mode)))
  const storedHistory = await prisma.setupValidationDecision.findMany({
    where: { userId, setupId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  const history = storedHistory.map(domainDecision)
  const hypothesis = evaluateValidationStage({
    stage: "HYPOTHESIS",
    policy: context.policy,
    definition: {
      market: context.setup.market,
      direction: context.setup.direction,
      description: context.setup.description,
      expectedAvgR: num(context.setup.expectedAvgR),
      checklistItemCount: context.setup.aplusChecklist.length + context.setup.standardChecklist.length,
    },
    trades: [],
    checklist: new Map(),
  })
  return {
    setup: { id: context.setup.id, name: context.setup.name },
    policy: context.row,
    hypothesis,
    stages: Object.fromEntries(evidence.map((item) => [item.mode, item])) as Record<OperationalMode, SetupValidationEvidence>,
    comparison: evidence.map((item) => ({
      mode: item.mode as OperationalMode,
      closedCount: item.closedCount,
      expectancyR: item.expectancyR,
      averageR: item.averageR,
      maxDrawdownR: item.maxDrawdownR,
      checklistCompliancePct: item.checklistCompliancePct,
      verdict: item.verdict,
    })),
    state: deriveValidationState(history as ValidationDecisionLike[]),
    history,
  }
}
