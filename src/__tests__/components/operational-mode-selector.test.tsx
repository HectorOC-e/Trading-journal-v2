// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OperationalModeSelector } from "@/components/ui/operational-mode-selector"
import { useOperationalModeStore } from "@/lib/operational-mode-store"

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({},"","/dashboard")
  useOperationalModeStore.setState({mode:"REAL"})
})
afterEach(cleanup)
describe("independent operational modes", () => {
  it("selects backtesting explicitly and keeps it when navigating", async () => {
    const view=render(<OperationalModeSelector />)
    await waitFor(()=>expect(screen.getByRole("tab",{name:"Real"})).toHaveAttribute("aria-selected","true"))
    fireEvent.click(screen.getByRole("tab",{name:"Backtesting"}))
    expect(useOperationalModeStore.getState().mode).toBe("BACKTEST")
    expect(new URLSearchParams(window.location.search).get("mode")).toBe("BACKTEST")
    view.unmount()
    window.history.pushState({},"","/analytics?mode=BACKTEST")
    render(<OperationalModeSelector />)
    expect(screen.getByRole("tab",{name:"Backtesting"})).toHaveAttribute("aria-selected","true")
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })
  it("gives a valid linked mode priority over a stored mode", async () => {
    localStorage.setItem("tj.operationalMode",JSON.stringify({state:{mode:"DEMO"},version:1}))
    window.history.replaceState({},"","/dashboard?mode=BACKTEST")
    render(<OperationalModeSelector />)
    await waitFor(()=>expect(screen.getByRole("tab",{name:"Backtesting"})).toHaveAttribute("aria-selected","true"))
  })
  it("does not turn an old mixed preference into a mixed mode", async () => {
    localStorage.setItem("tj.includePractice",JSON.stringify({state:{includePractice:true},version:0}))
    render(<OperationalModeSelector />)
    await waitFor(()=>expect(screen.getByRole("tab",{name:"Real"})).toHaveAttribute("aria-selected","true"))
    expect(screen.queryByText("Incluir práctica")).not.toBeInTheDocument()
  })
})
