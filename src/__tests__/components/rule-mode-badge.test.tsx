/**
 * @vitest-environment jsdom
 * RuleModeBadge — the enforce/warn badge (C6, SPRINT_PLAN S1, DESIGN_SYSTEM §5).
 * Color is never the sole carrier of meaning: each mode has a distinct text label.
 */
import { render, screen } from "@testing-library/react"
import { RuleModeBadge } from "@/components/rules/rule-mode-badge"

describe("RuleModeBadge", () => {
  it("labels an enforce rule as blocking", () => {
    render(<RuleModeBadge mode="enforce" />)
    expect(screen.getByText(/bloquea/i)).toBeInTheDocument()
  })

  it("labels a warn rule as advisory", () => {
    render(<RuleModeBadge mode="warn" />)
    expect(screen.getByText(/avisa/i)).toBeInTheDocument()
  })

  it("exposes the mode to assistive tech (text, not color alone)", () => {
    render(<RuleModeBadge mode="enforce" />)
    expect(screen.getByLabelText(/bloquea/i)).toBeInTheDocument()
  })
})