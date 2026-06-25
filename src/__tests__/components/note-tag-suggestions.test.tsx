/**
 * @vitest-environment jsdom
 * NoteTagSuggestions — suggestion-only chips derived from the note (#37). The user
 * confirms with one tap; nothing is applied automatically.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NoteTagSuggestions } from "@/components/trades/note-tag-suggestions"

describe("NoteTagSuggestions", () => {
  it("renders a chip per suggested tag not already applied", () => {
    render(<NoteTagSuggestions note="Entré por FOMO y dudé" applied={[]} onAdd={() => {}} />)
    expect(screen.getByText("FOMO")).toBeInTheDocument()
    expect(screen.getByText("Duda")).toBeInTheDocument()
  })

  it("hides suggestions that are already applied", () => {
    render(<NoteTagSuggestions note="Entré por FOMO" applied={["FOMO"]} onAdd={() => {}} />)
    expect(screen.queryByText("FOMO")).not.toBeInTheDocument()
  })

  it("renders nothing for a neutral note", () => {
    const { container } = render(<NoteTagSuggestions note="Entrada limpia" applied={[]} onAdd={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("calls onAdd with the tag when a chip is tapped", async () => {
    const onAdd = vi.fn()
    render(<NoteTagSuggestions note="puro FOMO" applied={[]} onAdd={onAdd} />)
    await userEvent.click(screen.getByText("FOMO"))
    expect(onAdd).toHaveBeenCalledWith("FOMO")
  })
})