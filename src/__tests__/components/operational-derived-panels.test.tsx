// @vitest-environment jsdom
import { afterEach, expect, it, vi, type Mock } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

const { queries, submit } = vi.hoisted(() => ({ queries: {} as Record<string, Mock<(input: unknown) => void>>, submit: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/use-toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/trpc/client", () => {
  const path = (key: string) => ({ useQuery: (input: unknown) => {
    (queries[key] ??= vi.fn<(input: unknown) => void>())(input)
    return { isLoading: true, data: undefined }
  }, useMutation: () => ({ mutate: submit, isPending: false }) })
  const utils = new Proxy({}, { get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn(), setData: vi.fn() }) }) })
  return { trpc: { useUtils: () => utils,
    behavior: Object.fromEntries(["openInsights", "commitments", "ruleSuggestions", "proposedCommitments", "createFromInsight", "evaluate", "archive", "linkRule", "acceptSuggestion", "dismissSuggestion", "acceptProposed", "dismissProposed"].map(k => [k, path(`behavior.${k}`)])),
    psychology: Object.fromEntries(["latestCheckin", "calibration", "moodTrend", "submitCheckin"].map(k => [k, path(`psychology.${k}`)])),
    today: Object.fromEntries(["feed", "plan", "dismiss"].map(k => [k, path(`today.${k}`)])),
    intervention: Object.fromEntries(["active", "respond"].map(k => [k, path(`intervention.${k}`)])),
  } }
})

import { useOperationalModeStore } from "@/lib/operational-mode-store"
import { BehaviorLoopPanel } from "@/components/behavior/behavior-loop-panel"
import { PsychologyV3Panel } from "@/components/psychology/psychology-v3-panel"
import { DailyPlan } from "@/components/today/daily-plan"
import { TodayFeed } from "@/components/today/today-feed"
import { InterventionOverlay } from "@/components/intervention/intervention-overlay"

afterEach(cleanup)

it("changing operational worlds changes every derived panel query and the check-in write", async () => {
  window.history.replaceState({}, "", "/?mode=DEMO")
  useOperationalModeStore.setState({ mode: "DEMO" })
  render(<><BehaviorLoopPanel /><PsychologyV3Panel /><DailyPlan /><TodayFeed /><InterventionOverlay /></>)
  await act(async () => {})
  for (const key of ["behavior.openInsights", "behavior.commitments", "behavior.ruleSuggestions", "behavior.proposedCommitments", "psychology.latestCheckin", "psychology.calibration", "psychology.moodTrend", "today.plan", "today.feed", "intervention.active"]) {
    expect(queries[key].mock.lastCall?.[0], key).toEqual({ mode: "DEMO" })
  }
  fireEvent.click(screen.getByRole("button", { name: "Evaluar mi estado" }))
  expect(submit).toHaveBeenLastCalledWith({ mood: 3, energy: 3, sleep: 3, mode: "DEMO" })
  act(() => useOperationalModeStore.getState().setMode("BACKTEST"))
  expect(queries["today.feed"].mock.lastCall?.[0]).toEqual({ mode: "BACKTEST" })
})
