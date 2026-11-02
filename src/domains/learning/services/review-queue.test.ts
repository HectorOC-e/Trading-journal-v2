import { expect, it } from "vitest"
import { isResourceReviewDue, reviewReason, compareReviewPriority } from "./review-queue"
it("uses calendar dates and explicit marks while excluding archived resources", () => {
  const today = "2026-07-01"
  expect(isResourceReviewDue({ status: "COMPLETED", nextReviewAt: new Date("2026-07-01T00:00:00Z") }, today)).toBe(true)
  expect(isResourceReviewDue({ status: "COMPLETED", nextReviewAt: "2026-07-02" }, today)).toBe(false)
  expect(isResourceReviewDue({ status: "MASTERED", nextReviewAt: "2026-06-01" }, today)).toBe(false)
  expect(isResourceReviewDue({ status: "MASTERED", markedForReview: true }, today)).toBe(true)
  expect(isResourceReviewDue({ status: "ABANDONED", markedForReview: true }, today)).toBe(false)
})

it("explains overdue, today, manual and ineligible resources", () => {
 expect(reviewReason({status:"COMPLETED",markedForReview:true,nextReviewAt:new Date("2026-10-31T00:00:00Z")},"2026-11-02")).toEqual({kind:"overdue",label:"Vencido hace 2 días"})
 expect(reviewReason({status:"COMPLETED",nextReviewAt:"2026-11-01"},"2026-11-02")?.label).toBe("Vencido hace 1 día")
 expect(reviewReason({status:"COMPLETED",nextReviewAt:"2026-11-02"},"2026-11-02")?.kind).toBe("today")
 expect(reviewReason({status:"MASTERED",markedForReview:true,nextReviewAt:"2026-12-01"},"2026-11-02")?.kind).toBe("manual")
 for(const status of ["MASTERED","ABANDONED","ARCHIVED"]) expect(reviewReason({status,nextReviewAt:"2026-01-01"},"2026-11-02")).toBeNull()
 expect(compareReviewPriority({status:"COMPLETED",nextReviewAt:"2026-11-02"},{status:"COMPLETED",markedForReview:true},"2026-11-02")).toBeLessThan(0)
})
