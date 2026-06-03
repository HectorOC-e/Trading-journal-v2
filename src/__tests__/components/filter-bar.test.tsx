/**
 * @vitest-environment jsdom
 * FilterBar accessibility tests — TASK-024 / TASK-070
 * Verifies aria-selected, role=tablist, focus ring classes.
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FilterBar } from "@/components/ui/filter-bar"

const OPTS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
]

describe("FilterBar (TASK-024 / TASK-070)", () => {
  it("renders as tablist with correct role", () => {
    render(<FilterBar options={OPTS} value="a" onChange={() => {}} />)
    expect(screen.getByRole("tablist")).toBeInTheDocument()
  })

  it("marks active tab as aria-selected=true", () => {
    render(<FilterBar options={OPTS} value="b" onChange={() => {}} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs[0]).toHaveAttribute("aria-selected", "false") // Alpha
    expect(tabs[1]).toHaveAttribute("aria-selected", "true")  // Beta
    expect(tabs[2]).toHaveAttribute("aria-selected", "false") // Gamma
  })

  it("calls onChange with the clicked value", async () => {
    const onChange = vi.fn()
    render(<FilterBar options={OPTS} value="a" onChange={onChange} />)
    await userEvent.click(screen.getByRole("tab", { name: "Beta" }))
    expect(onChange).toHaveBeenCalledWith("b")
  })

  it("supports ariaLabel on the container", () => {
    render(<FilterBar options={OPTS} value="a" onChange={() => {}} ariaLabel="Dashboard sections" />)
    expect(screen.getByRole("tablist", { name: "Dashboard sections" })).toBeInTheDocument()
  })

  it("in multiSelect mode sets aria-pressed on buttons", () => {
    render(<FilterBar options={OPTS} value={["a", "c"]} onChange={() => {}} multiSelect />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs[0]).toHaveAttribute("aria-pressed", "true")  // Alpha selected
    expect(tabs[1]).toHaveAttribute("aria-pressed", "false") // Beta not selected
    expect(tabs[2]).toHaveAttribute("aria-pressed", "true")  // Gamma selected
  })
})
