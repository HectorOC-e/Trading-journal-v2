/**
 * @vitest-environment jsdom
 * KpiCard accessibility tests — TASK-024 / TASK-070
 * Verifies aria-label combines label + value + sub for screen readers.
 */

import { render, screen } from "@testing-library/react"
import { KpiCard } from "@/components/ui/kpi-card"

describe("KpiCard (TASK-024 / TASK-070)", () => {
  it("renders aria-label combining label and value", () => {
    render(<KpiCard label="Win Rate" value="62%" trend="up" />)
    const card = screen.getByRole("generic", { name: /Win Rate: 62%/ })
    expect(card).toBeInTheDocument()
  })

  it("includes sub in aria-label when sub is provided", () => {
    render(<KpiCard label="Net P&L" value="+$1,200" sub="30 trades" trend="up" />)
    expect(screen.getByRole("generic", { name: "Net P&L: +$1,200, 30 trades" })).toBeInTheDocument()
  })

  it("icons are aria-hidden to avoid screen reader noise", () => {
    const { container } = render(
      <KpiCard label="Sharpe" value="1.4" icon={<span data-testid="icon">📈</span>} trend="up" />
    )
    const iconWrapper = container.querySelector("[aria-hidden='true']")
    expect(iconWrapper).not.toBeNull()
  })

  it("renders value text visually", () => {
    render(<KpiCard label="Avg R" value="+1.8R" trend="up" />)
    expect(screen.getByText("+1.8R")).toBeInTheDocument()
  })
})
