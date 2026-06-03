import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/domains/analytics/ai-context", () => ({
  buildTraderContext: vi.fn(),
}))
vi.mock("@/lib/ai/chat", () => ({
  streamChat: vi.fn(),
}))
vi.mock("@/lib/ai/config", () => ({
  getCoachModel: vi.fn().mockReturnValue("claude-sonnet-4-6"),
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
  recentTrades: [],
  patterns:     [],
}

const MOCK_STREAM = new ReadableStream()

describe("coach-service (TASK-065)", () => {
  beforeEach(() => {
    mockBuildTraderContext.mockResolvedValue(MOCK_CONTEXT)
    mockStreamChat.mockResolvedValue(MOCK_STREAM)
  })

  it("calls buildTraderContext with the correct userId", async () => {
    const prisma = {} as never
    await streamCoachReply({ userId: "user-123", messages: [], prisma })
    expect(mockBuildTraderContext).toHaveBeenCalledWith("user-123", prisma)
  })

  it("passes messages and a system prompt to streamChat", async () => {
    const messages = [{ role: "user" as const, content: "¿Cómo mejorar mi win rate?" }]
    await streamCoachReply({ userId: "user-123", messages, prisma: {} as never })

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: messages,
        system:   expect.stringContaining("coach de trading"),
      }),
    )
  })

  it("includes trader performance data in the system prompt", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: {} as never })

    const callArgs = mockStreamChat.mock.calls[0][0]
    expect(callArgs.system).toContain("60%") // win rate
    expect(callArgs.system).toContain("500")  // netPnl
  })

  it("returns the ReadableStream from streamChat directly", async () => {
    const result = await streamCoachReply({ userId: "user-123", messages: [], prisma: {} as never })
    expect(result).toBe(MOCK_STREAM)
  })

  it("includes model from getCoachModel", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: {} as never })
    const callArgs = mockStreamChat.mock.calls[0][0]
    expect(callArgs.model).toBe("claude-sonnet-4-6")
  })
})
