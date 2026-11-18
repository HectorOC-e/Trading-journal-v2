import { beforeEach, describe, expect, it, vi } from "vitest"

const services = vi.hoisted(() => ({
  getSetupValidationOverview: vi.fn(),
  getSetupValidationEvidence: vi.fn(),
  getSetupValidationHistory: vi.fn(),
  getValidationPolicy: vi.fn(),
  buildValidationEvidenceSignature: vi.fn(() => "hypothesis-signature"),
}))
vi.mock("@/server/services/setups/validation-service", () => services)

import { playbookRouter } from "@/server/trpc/routers/playbook"

const userId = "550e8400-e29b-41d4-a716-446655440001"
const setupId = "550e8400-e29b-41d4-a716-446655440002"
const requestId = "550e8400-e29b-41d4-a716-446655440003"

const eligible = {
  stage: "BACKTEST",
  mode: "BACKTEST",
  verdict: "ELIGIBLE",
  signature: "backtest-signature",
  closedCount: 30,
  expectancyR: 0.4,
}
const policy = {
  id: "550e8400-e29b-41d4-a716-446655440004",
  userId,
  setupId,
  version: 1,
  backtestMinClosed: 30,
  backtestMinRCoveragePct: 80,
  backtestMinChecklistCoveragePct: 70,
  backtestRequirePositiveExpectancy: true,
  demoMinClosed: 20,
  demoMinDistinctWeeks: 4,
  demoMinChecklistCompliancePct: 80,
  demoRequirePositiveExpectancy: true,
  realMonitorMinClosed: 20,
  realMonitorMinDistinctWeeks: 4,
  criteria: {},
}

function overview(currentStage = "HYPOTHESIS", hypothesisVerdict = "ELIGIBLE") {
  return {
    setup: { id: setupId, name: "Ruptura" },
    policy,
    state: { currentStage, suspended: false },
    hypothesis: { stage: "HYPOTHESIS", mode: null, verdict: hypothesisVerdict, criteria: [] },
    stages: {
      BACKTEST: eligible,
      DEMO: { ...eligible, stage: "DEMO", mode: "DEMO", signature: "demo-signature" },
      REAL: { ...eligible, stage: "REAL", mode: "REAL", signature: "real-signature", monitoringOnly: true },
    },
    comparison: [],
    history: [],
  }
}

function fixture() {
  const decisionCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: requestId, ...data }))
  const prisma: Record<string, unknown> & { $transaction: (fn: (tx: unknown) => unknown) => unknown } = {
    setupValidationPolicy: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      findFirst: vi.fn(async () => ({ ...policy, version: 2 })),
    },
    setupValidationDecision: {
      findFirst: vi.fn(async () => null),
      create: decisionCreate,
    },
    $queryRaw: vi.fn(async () => [{ id: setupId }]),
    $transaction: async (fn) => fn(prisma),
  }
  const caller = playbookRouter.createCaller({ userId, prisma, supabase: {} } as never)
  return { prisma, caller, decisionCreate }
}

beforeEach(() => {
  vi.clearAllMocks()
  services.getSetupValidationOverview.mockResolvedValue(overview())
  services.getSetupValidationEvidence.mockResolvedValue(eligible)
  services.getSetupValidationHistory.mockResolvedValue([])
  services.getValidationPolicy.mockResolvedValue(policy)
  services.buildValidationEvidenceSignature.mockReturnValue("hypothesis-signature")
})

describe("playbook validation router", () => {
  it("exposes owned overview, evidence, policy and history contracts", async () => {
    const { caller } = fixture()
    await expect(caller.validationOverview({ setupId })).resolves.toMatchObject({ setup: { id: setupId } })
    await expect(caller.validationEvidence({ setupId, mode: "BACKTEST" })).resolves.toMatchObject({ mode: "BACKTEST" })
    await expect(caller.validationPolicy({ setupId })).resolves.toMatchObject({ version: 1 })
    await expect(caller.validationHistory({ setupId })).resolves.toEqual([])
    expect(services.getSetupValidationOverview).toHaveBeenCalledWith(expect.anything(), userId, setupId)
  })

  it("validates policy bounds, ownership and optimistic version conflicts", async () => {
    const { caller, prisma } = fixture()
    await expect(caller.updateValidationPolicy({
      setupId,
      expectedVersion: 1,
      backtestMinRCoveragePct: 101,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" })

    services.getValidationPolicy.mockResolvedValueOnce(null)
    await expect(caller.updateValidationPolicy({ setupId, expectedVersion: 1, demoMinClosed: 25 })).rejects.toMatchObject({ code: "NOT_FOUND" })

    ;(prisma.setupValidationPolicy as { updateMany: ReturnType<typeof vi.fn> }).updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(caller.updateValidationPolicy({ setupId, expectedVersion: 1, demoMinClosed: 25 })).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("locks the setup and stores only a server-calculated evidence snapshot", async () => {
    const { caller, prisma, decisionCreate } = fixture()
    const result = await caller.createValidationDecision({
      setupId,
      idempotencyKey: requestId,
      action: "PROMOTE",
      targetStage: "BACKTEST",
      expectedPolicyVersion: 1,
      expectedCurrentStage: "HYPOTHESIS",
      note: "La hipótesis está definida.",
      evidenceSnapshot: { forged: true },
    } as never)

    expect(prisma.$queryRaw).toHaveBeenCalled()
    expect(decisionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId,
      setupId,
      fromStage: "HYPOTHESIS",
      toStage: "BACKTEST",
      mode: null,
      policyVersion: 1,
      evidenceSignature: "hypothesis-signature",
      evidenceSnapshot: expect.objectContaining({ schemaVersion: 1, verdict: "ELIGIBLE" }),
    }) })
    expect((decisionCreate.mock.calls[0][0].data.evidenceSnapshot as Record<string, unknown>)).not.toHaveProperty("forged")
    expect(result).toMatchObject({ action: "PROMOTE", toStage: "BACKTEST" })
  })

  it("requires a reason for an exceptional promotion but permits the explained decision", async () => {
    services.getSetupValidationOverview.mockResolvedValue(overview("HYPOTHESIS", "INCOMPLETE"))
    const { caller, decisionCreate } = fixture()
    const input = {
      setupId,
      idempotencyKey: requestId,
      action: "PROMOTE" as const,
      targetStage: "BACKTEST" as const,
      expectedPolicyVersion: 1,
      expectedCurrentStage: "HYPOTHESIS" as const,
    }
    await expect(caller.createValidationDecision(input)).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(decisionCreate).not.toHaveBeenCalled()

    await expect(caller.createValidationDecision({ ...input, exceptionReason: "Validaré la definición con supervisión antes de operar." })).resolves.toMatchObject({ action: "PROMOTE" })
  })

  it("rejects skipped stages, stale state, stale policy and completion of Real", async () => {
    const { caller } = fixture()
    await expect(caller.createValidationDecision({
      setupId, idempotencyKey: requestId, action: "PROMOTE", targetStage: "DEMO",
      expectedPolicyVersion: 1, expectedCurrentStage: "HYPOTHESIS",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" })

    await expect(caller.createValidationDecision({
      setupId, idempotencyKey: requestId, action: "PROMOTE", targetStage: "BACKTEST",
      expectedPolicyVersion: 2, expectedCurrentStage: "HYPOTHESIS",
    })).rejects.toMatchObject({ code: "CONFLICT" })

    await expect(caller.createValidationDecision({
      setupId, idempotencyKey: requestId, action: "PROMOTE", targetStage: "BACKTEST",
      expectedPolicyVersion: 1, expectedCurrentStage: "DEMO",
    })).rejects.toMatchObject({ code: "CONFLICT" })

    services.getSetupValidationOverview.mockResolvedValue(overview("REAL"))
    await expect(caller.createValidationDecision({
      setupId, idempotencyKey: requestId, action: "PROMOTE", targetStage: "REAL",
      expectedPolicyVersion: 1, expectedCurrentStage: "REAL",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("returns an equivalent idempotent retry and rejects key reuse with different intent", async () => {
    const { caller, prisma, decisionCreate } = fixture()
    const existing = {
      id: requestId,
      userId,
      setupId,
      fromStage: "HYPOTHESIS",
      toStage: "BACKTEST",
      action: "PROMOTE",
      note: "",
      exceptionReason: null,
    }
    ;(prisma.setupValidationDecision as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing)
    const base = {
      setupId, idempotencyKey: requestId, action: "PROMOTE" as const,
      expectedPolicyVersion: 1, expectedCurrentStage: "HYPOTHESIS" as const,
    }
    await expect(caller.createValidationDecision({ ...base, targetStage: "BACKTEST" })).resolves.toEqual(existing)
    expect(decisionCreate).not.toHaveBeenCalled()
    await expect(caller.createValidationDecision({ ...base, targetStage: "DEMO" })).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
