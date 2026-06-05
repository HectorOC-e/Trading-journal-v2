import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/domains/analytics/ai-context", () => ({
  buildTraderContext: vi.fn(),
}))
vi.mock("@/lib/ai/chat", () => ({
  streamChat: vi.fn(),
}))
// resolve-provider falls back to the env key via getProviderKey when no persisted
// user key exists; return a stub key so a usable candidate is available.
vi.mock("@/lib/ai/config", () => ({
  getProviderKey: vi.fn().mockReturnValue("test-key"),
}))

import { streamCoachReply } from "@/lib/ai/coach-service"
import { buildTraderContext } from "@/domains/analytics/ai-context"
import { streamChat } from "@/lib/ai/chat"

const mockBuildTraderContext = buildTraderContext as ReturnType<typeof vi.fn>
const mockStreamChat         = streamChat as ReturnType<typeof vi.fn>

const MOCK_CONTEXT = {
  performance: {
    totalTrades: 20, winRate: 60, avgR: 1.2, netPnl: 500, pnlMonth: 150,
    sharpeRatio: 1.1, bestSetup: null, worstSetup: null,
  },
  behavior: {
    violationCount: 2, violationsByTag: { "Off-plan": 2 },
    costoIndisciplina: 120, rachaDiasLimpios: 5, offPlanPct: 10,
  },
  learning:     { pendingReviews: 3, reviewsDoneThisMonth: 5, masteredResources: 2 },
  goals: {
    weeklyPnlGoal: 1000, weeklyTradesGoal: 15, disciplineGoal: 80, weeklyGoalMinutes: 300,
    weekPnl: 250, weekTrades: 8,
  },
  recentTrades: [],
  patterns:     [],
}

const MOCK_STREAM = new ReadableStream()

// Minimal prisma mock — no per-user AI settings row and no persisted key →
// platform defaults apply and the key resolves via the env fallback (mocked above).
const mockPrisma = {
  userAiSettings: { findUnique: () => Promise.resolve(null) },
  userAiConfig:   { findUnique: () => Promise.resolve(null) },
} as never

describe("coach-service (TASK-065)", () => {
  beforeEach(() => {
    mockBuildTraderContext.mockResolvedValue(MOCK_CONTEXT)
    mockStreamChat.mockResolvedValue(MOCK_STREAM)
  })

  it("calls buildTraderContext with the correct userId", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    expect(mockBuildTraderContext).toHaveBeenCalledWith("user-123", mockPrisma)
  })

  it("passes messages and a system prompt to streamChat", async () => {
    const messages = [{ role: "user" as const, content: "¿Cómo mejorar mi win rate?" }]
    await streamCoachReply({ userId: "user-123", messages, prisma: mockPrisma })

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: messages,
        system:   expect.stringContaining("coach de trading"),
      }),
    )
  })

  it("includes trader performance data in the system prompt", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })

    const callArgs = mockStreamChat.mock.calls[0][0]
    expect(callArgs.system).toContain("60%") // win rate
    expect(callArgs.system).toContain("500")  // netPnl
  })

  it("returns the ReadableStream from streamChat directly", async () => {
    const result = await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    expect(result).toBe(MOCK_STREAM)
  })

  it("resolves the default model from settings (platform default)", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const callArgs = mockStreamChat.mock.calls[0][0]
    expect(callArgs.model).toBe("claude-sonnet-4-6")
  })

  it("threads the resolved provider and api key to streamChat", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const callArgs = mockStreamChat.mock.calls[0][0]
    expect(callArgs.provider).toBe("anthropic")  // platform default provider
    expect(callArgs.apiKey).toBe("test-key")      // from env fallback
  })
})
