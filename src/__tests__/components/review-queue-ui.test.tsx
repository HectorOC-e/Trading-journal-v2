// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { ResourceCard } from "@/components/aprendizaje/resource-card"
import type { LearningResource } from "@/types"

afterEach(cleanup)
const base = {
  type: "LIBRO", status: "IN_PROGRESS", author: "", source: "", notes: "", tags: [],
  date: "2026-11-01", createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
  linkedSetups: [], markedForReview: false, nextReviewAt: null,
} as unknown as LearningResource

it("uses the same due queue for the library filter and card action", () => {
  const resources = [
    { ...base, id: "due", title: "Due resource", nextReviewAt: "2026-11-01" },
    { ...base, id: "marked", title: "Marked mastered", status: "MASTERED", markedForReview: true },
    { ...base, id: "mastered", title: "Mastered clear", status: "MASTERED", nextReviewAt: "2026-10-01" },
  ] as LearningResource[]
  render(<ResourceGrid resources={resources} todayISO="2026-11-01" />)
  fireEvent.click(screen.getByRole("button", { name: "Solo review" }))
  expect(screen.getByText("Due resource")).toBeInTheDocument()
  expect(screen.getByText("Marked mastered")).toBeInTheDocument()
  expect(screen.queryByText("Mastered clear")).not.toBeInTheDocument()
})

it("offers a review for an explicitly marked mastered resource", () => {
  render(<ResourceCard resource={{ ...base, id: "marked", title: "Marked mastered", status: "MASTERED", markedForReview: true }} todayISO="2026-11-01" />)
  expect(screen.getByRole("button", { name: /Repasar hoy/ })).toBeInTheDocument()
})
