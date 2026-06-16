import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/domains/analytics/ai-context", () => ({
  buildTraderContext: vi.fn(),
}))
vi.mock("@/lib/ai/chat", () => ({
  streamChat: vi.fn(),
}))
// Anthropic (the platform default provider) routes through the agentic path.
vi.mock("@/lib/ai/coach-agent", () => ({
  streamCoachAgent: vi.fn(),
}))
// resolve-provider falls back to the env key via getProviderKey when no persisted
// user key exists; return a stub key so a usable candidate is available.
vi.mock("@/lib/ai/config", () => ({
  getProviderKey: vi.fn().mockReturnValue("test-key"),
}))

import { streamCoachReply } from "@/lib/ai/coach-service"
import { buildTraderContext } from "@/domains/analytics/ai-context"
import { streamCoachAgent } from "@/lib/ai/coach-agent"

const mockBuildTraderContext = buildTraderContext as ReturnType<typeof vi.fn>
const mockAgent              = streamCoachAgent as ReturnType<typeof vi.fn>

// system is an array of { text, cache } blocks (prompt caching) — flatten for assertions.
function systemText(): string {
  const s = mockAgent.mock.calls[0][0].system
  return Array.isArray(s) ? s.map((b: { text: string }) => b.text).join("\n\n") : (s ?? "")
}

const MOCK_CONTEXT = {
  performance: {
    totalTrades: 20, winRate: 60, avgR: 1.2, netPnl: 500, pnlMonth: 150,
    sharpeRatio: 1.1, bestSetup: null, worstSetup: null,
  },
  behavior: {
    violationCount: 2, violationsByTag: { "Off-plan": 2 },
    costoIndisciplina: 120, rachaDiasLimpios: 5, offPlanPct: 10,
  },
  learning:     {
    pendingReviews: 3, reviewsDoneThisMonth: 5, masteredResources: 2,
    activeResources: [{ title: "Order Flow Mechanics", type: "COURSE", progressPct: 40 }],
    dueReviews: { count: 1, nextTitles: ["Risk Management Masterclass"] },
    studyMinutesWeek: 120, studyStreak: 2, sessionsLast7d: 3,
    weaknessResource: null,
  },
  goals: {
    weeklyPnlGoal: 1000, weeklyTradesGoal: 15, disciplineGoal: 80, weeklyGoalMinutes: 300,
    weekPnl: 250, weekTrades: 8,
  },
  recentTrades: [],
  patterns:     [],
  baseCurrency: "USD",
  accounts: [
    { name: "FTMO 100K", type: "PROP_FIRM", currency: "USD", phase: "FUNDED", status: "ACTIVE", locked: false, lockReason: null, balance: 107680, ddDailyPct: 5, ddTotalPct: 10, targetPct: 8 },
  ],
  setups: [
    { name: "Breakout London", abbreviation: "BL", market: "Forex", direction: "AMBAS", status: "ACTIVO", expectedWr: 55, expectedAvgR: 1.2, winRate: 60, avgR: 1.4, tradeCount: 12, health: "healthy" },
  ],
  withdrawals: { USD: { PAGADO: { count: 2, amount: 8500 } } },
  rules:       [{ name: "Max 2 trades/día", severity: "CRÍTICA" }],
  psychology:  { sessions: 4, avgPreMood: 3.5, avgEnergy: 4 },
  markets:     [{ symbol: "EURUSD", name: "Euro / Dólar" }],
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
    mockAgent.mockResolvedValue(MOCK_STREAM)
  })

  it("calls buildTraderContext with the correct userId", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    expect(mockBuildTraderContext).toHaveBeenCalledWith("user-123", mockPrisma)
  })

  it("passes messages and a system prompt to streamChat", async () => {
    const messages = [{ role: "user" as const, content: "¿Cómo mejorar mi win rate?" }]
    await streamCoachReply({ userId: "user-123", messages, prisma: mockPrisma })

    expect(mockAgent).toHaveBeenCalledWith(expect.objectContaining({ messages }))
    expect(systemText()).toContain("coach de trading")
  })

  it("includes trader performance data in the system prompt", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    expect(systemText()).toContain("60%") // win rate
    expect(systemText()).toContain("500") // netPnl
  })

  it("includes global context (accounts + setups by name) in the system prompt", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const system = systemText()
    expect(system).toContain("FTMO 100K")        // account by name
    expect(system).toContain("Breakout London")  // setup by name
    expect(system).toContain("PROP_FIRM")
  })

  it("includes the app-usage knowledge block", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const system = systemText()
    expect(system).toContain("Cómo funciona la app")
    expect(system).toContain("Cómo hacer tareas clave")
  })

  it("sends system as cacheable static block + dynamic data block", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const system = mockAgent.mock.calls[0][0].system
    expect(Array.isArray(system)).toBe(true)
    expect(system[0].cache).toBe(true)                       // static block cached
    expect(system[0].text).toContain("Cómo funciona la app") // app-knowledge is static
    expect(system[1].text).toContain("FTMO 100K")            // trader data is dynamic
  })

  it("returns the ReadableStream from streamChat directly", async () => {
    const result = await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    expect(result).toBe(MOCK_STREAM)
  })

  it("resolves the default model from settings (platform default)", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const callArgs = mockAgent.mock.calls[0][0]
    expect(callArgs.model).toBe("claude-sonnet-4-6")
  })

  it("routes the Anthropic default through the agentic path with key + prisma + userId", async () => {
    await streamCoachReply({ userId: "user-123", messages: [], prisma: mockPrisma })
    const callArgs = mockAgent.mock.calls[0][0]
    expect(callArgs.apiKey).toBe("test-key") // from env fallback
    expect(callArgs.prisma).toBe(mockPrisma) // tools need DB access
    expect(callArgs.userId).toBe("user-123")
  })
})
