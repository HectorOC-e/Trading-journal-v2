import { expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { streamAnalyticsInsights } from "@/lib/ai/analytics-insights-service"
import { streamPsychologyInsights } from "@/lib/ai/psychology-insights-service"
const { prompts } = vi.hoisted(() => ({ prompts: [] as string[] }))
vi.mock("@/lib/ai/resolve-provider", () => ({
  resolveAiCall: async () => ({ primary: { provider: "openai" } }),
  usableCandidates: () => [{ provider: "openai", model: "mock", apiKey: "synthetic" }],
}))
vi.mock("@/lib/ai/execute", () => ({ executeAiCall: async ({ candidates, run }: any) => run(candidates[0]) }))
vi.mock("@/lib/ai/chat", () => ({ streamChat: async ({ messages }: any) => { prompts.push(messages[0].content); return new ReadableStream({ start(c) { c.close() } }) } }))
vi.mock("@/domains/analytics/services/analytics-bundle", () => ({ buildAnalyticsBundle: async (_user: string, _prisma: unknown, _window: unknown, mode = "REAL") => ({
  scope: { mode, dateBasis: "TRADE_DATE", excludedCurrencies: [] }, window: { from: null, to: null }, baseCurrency: "USD",
  performance: { totalTrades: 1, winRate: 0, profitFactor: 0, expectancy: mode === "DEMO" ? -50 : 100, avgR: -0.5, netPnl: mode === "DEMO" ? -50 : 100 },
  risk: { worstDrawdownPct: 0, accounts: [] }, setups: [], markets: [],
  psychology: { disciplineScore: 0, violationRate: 100, fomoCount: 0, revengeCount: 0, byEmotion: [] },
  withdrawals: { count: 0, total: 0, impactPct: 0 }, goals: { weekPnl: -50, weekTrades: 1 },
  raw: { trades: [], setupsMeta: [], accountsMeta: [], withdrawals: [] },
}) }))

it("analytics narrative is generated from the selected mode and declares its provenance", async () => {
  await streamAnalyticsInsights({ userId: "u", prisma: {} as PrismaClient, mode: "DEMO", period: "ALL" })
  expect(prompts.at(-1)).toContain("Net P&L -50")
  expect(prompts.at(-1)).toContain("DEMO")
  expect(prompts.at(-1)).toContain("USD")
})

it("psychology narrative uses the same isolated mode, never the Real default", async () => {
  await streamPsychologyInsights({ userId: "u", prisma: {} as PrismaClient, mode: "DEMO", period: "ALL" })
  expect(prompts.at(-1)).toContain("expectancy -50")
  expect(prompts.at(-1)).toContain("DEMO")
})
