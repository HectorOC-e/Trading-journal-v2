import { describe, expect, it } from "vitest"
import { reviewCountdown } from "@/components/aprendizaje/resource-card"
import { calcPreviewNextReview } from "@/app/aprendizaje/utils/review-helpers"
import { isReviewDue } from "@/app/aprendizaje/utils/mastery"

describe("review calendar dates", () => {
  it("uses the supplied profile day for due dates and countdowns", () => {
    const due = "2026-11-01T00:00:00.000Z"
    expect(isReviewDue(due, "2026-10-31")).toBe(false)
    expect(reviewCountdown(due, "2026-10-31")).toBe("Review en 1 día")
    expect(isReviewDue(due, "2026-11-01")).toBe(true)
    expect(reviewCountdown(due, "2026-11-01")).toBe("Review hoy")
    expect(reviewCountdown(due, "2026-11-02")).toBe("Review vencida")
  })
  it("previews scheduled reviews using profile calendar arithmetic across DST", () => {
    expect(calcPreviewNextReview(1, 3, "2026-10-31")).toBe("1 nov 2026")
    expect(calcPreviewNextReview(7, 4, "2026-10-31")).toBe("11 nov 2026")
  })
})
