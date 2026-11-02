import { expect, it } from "vitest"
import { isResourceReviewDue } from "./review-queue"
it("uses calendar dates and explicit marks while excluding archived resources", () => {
  const today = "2026-07-01"
  expect(isResourceReviewDue({ status: "COMPLETED", nextReviewAt: new Date("2026-07-01T00:00:00Z") }, today)).toBe(true)
  expect(isResourceReviewDue({ status: "COMPLETED", nextReviewAt: "2026-07-02" }, today)).toBe(false)
  expect(isResourceReviewDue({ status: "MASTERED", nextReviewAt: "2026-06-01" }, today)).toBe(false)
  expect(isResourceReviewDue({ status: "MASTERED", markedForReview: true }, today)).toBe(true)
  expect(isResourceReviewDue({ status: "ABANDONED", markedForReview: true }, today)).toBe(false)
})
