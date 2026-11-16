// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { OperationalComparisonTable } from "@/components/trades/operational-comparison"
afterEach(cleanup)
describe("separate comparison cohorts", () => {
  it("shows three labelled results without manufacturing a combined balance", () => {
    render(<OperationalComparisonTable rows={[
      {mode:"REAL",pnl:100,trades:1,winRate:100,avgR:1,currency:"USD"},
      {mode:"DEMO",pnl:500,trades:1,winRate:100,avgR:5,currency:"USD"},
      {mode:"BACKTEST",pnl:-200,trades:1,winRate:0,avgR:-2,currency:"USD"},
    ]} />)
    expect(screen.getByText("Real")).toBeInTheDocument()
    expect(screen.getByText("Demo")).toBeInTheDocument()
    expect(screen.getByText("Backtesting")).toBeInTheDocument()
    for (const amount of [/100\.00/,/500\.00/,/200\.00/]) expect(screen.getByText(amount)).toBeInTheDocument()
    expect(screen.queryByText(/400\.00/)).not.toBeInTheDocument()
    expect(screen.queryByText("Saldo total")).not.toBeInTheDocument()
  })
})
