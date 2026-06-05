/**
 * @vitest-environment jsdom
 * MonthlyReviewCard regression tests — Sprint 8 QA fixes
 * B-02: outer card must carry the `group` class so group-hover buttons are visible
 * M-01: toggle button must use aria-pressed, not the invalid aria-selected
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MonthlyReviewCard } from "@/app/reviews/components/monthly-review-card"

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id:           "mr-test-1",
    userId:       "user-1",
    year:         2026,
    month:        6,
    summary:      "Buen mes",
    keyThemes:    ["FOMO controlado"],
    goalsSet:     [],
    goalsMet:     [],
    overallScore: 74,
    weeklyIds:    ["wr-1"],
    createdAt:    "2026-06-30T00:00:00Z",
    updatedAt:    "2026-06-30T00:00:00Z",
    ...overrides,
  }
}

describe("MonthlyReviewCard (B-02 / M-01 regression guards)", () => {
  // ── B-02: group class ──────────────────────────────────────────────────────

  it("outer card div has `group` class (B-02 — enables group-hover button visibility)", () => {
    const { container } = render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.classList.contains("group")).toBe(true)
  })

  it("edit button is present in the DOM (B-02 — was invisible without group class)", () => {
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: /editar review de junio 2026/i })).toBeInTheDocument()
  })

  it("delete button is present in the DOM (B-02)", () => {
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: /eliminar review de junio 2026/i })).toBeInTheDocument()
  })

  it("edit click fires onEdit and does not bubble to card onClick (B-02)", async () => {
    const onClick = vi.fn()
    const onEdit  = vi.fn()
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /editar review de junio 2026/i }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it("delete click fires onDelete and does not bubble to card onClick (B-02)", async () => {
    const onClick   = vi.fn()
    const onDelete  = vi.fn()
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={onClick}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /eliminar review de junio 2026/i }))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  // ── M-01: aria-pressed vs aria-selected ───────────────────────────────────

  it("card has aria-pressed=false when not selected (M-01 — aria-selected is invalid on role=button)", () => {
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // Exact label match avoids ambiguity with "Editar review de…" / "Eliminar review de…"
    const card = screen.getByRole("button", { name: "Review de Junio 2026" })
    expect(card).toHaveAttribute("aria-pressed", "false")
    expect(card).not.toHaveAttribute("aria-selected")
  })

  it("card has aria-pressed=true when selected (M-01)", () => {
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={true}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const card = screen.getByRole("button", { name: "Review de Junio 2026" })
    expect(card).toHaveAttribute("aria-pressed", "true")
  })

  it("aria-pressed reflects isSelected toggle across rerenders (M-01)", () => {
    const { rerender } = render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const card = screen.getByRole("button", { name: "Review de Junio 2026" })
    expect(card).toHaveAttribute("aria-pressed", "false")

    rerender(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={true}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(card).toHaveAttribute("aria-pressed", "true")
  })

  // ── Card click ────────────────────────────────────────────────────────────

  it("clicking the card body fires onClick", async () => {
    const onClick = vi.fn()
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={onClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: "Review de Junio 2026" }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("Enter key on the card fires onClick (keyboard accessibility)", async () => {
    const onClick = vi.fn()
    render(
      <MonthlyReviewCard
        review={makeReview() as never}
        isSelected={false}
        onClick={onClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const card = screen.getByRole("button", { name: "Review de Junio 2026" })
    card.focus()
    await userEvent.keyboard("{Enter}")
    expect(onClick).toHaveBeenCalledOnce()
  })
})
