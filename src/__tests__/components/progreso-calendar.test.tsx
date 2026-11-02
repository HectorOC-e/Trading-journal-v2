// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ProgresoSections } from "@/app/aprendizaje/components/progreso-sections"

vi.mock("@/lib/trpc/client", () => ({ trpc: { learningResources: {
  stats: { useQuery: () => ({ data: { urgentReviews: [], decayedCount: 0, focusResource: { id: "r", title: "Study", type: "LIBRO", nextReviewAt: "2026-11-01" } } }) },
  dailyInsight: { useQuery: () => ({ data: null }) },
  resourceImpactRanking: { useQuery: () => ({ data: [] }) },
} } }))
vi.mock("@/lib/study-session-store", () => ({ useStudySessionStore: () => ({ openPicker: vi.fn() }) }))
vi.mock("@/components/ui/motion", () => ({ FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
afterEach(cleanup)
it("keeps the focus review on November 1 in browsers west of UTC", () => {
  render(<ProgresoSections resources={[]} reviewPending={[]} rawResources={[]} onRevisarResource={vi.fn()} />)
  expect(screen.getByText("⏰ Review: 1 nov")).toBeInTheDocument()
})
