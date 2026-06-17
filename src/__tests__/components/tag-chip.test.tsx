/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TagChipView } from "@/components/tags/tag-chip"
import type { TagMeta } from "@/lib/tags"

function meta(over: Partial<TagMeta>): TagMeta {
  return {
    name: "Off-plan", color: "#ef4444", icon: null, description: "", category: "",
    displayMode: "icon_color", sortOrder: 0, isSystem: false, semantic: null, ...over,
  }
}

describe("TagChipView", () => {
  it("renders the name in icon_color mode", () => {
    render(<TagChipView meta={meta({ displayMode: "icon_color" })} />)
    expect(screen.getByText("Off-plan")).toBeTruthy()
  })

  it("renders a color dot + name in dot mode", () => {
    const { container } = render(<TagChipView meta={meta({ displayMode: "dot", name: "FOMO" })} />)
    expect(screen.getByText("FOMO")).toBeTruthy()
    // the dot is an inline span with the tag color as background
    const dot = container.querySelector('span[style*="background"]')
    expect(dot).toBeTruthy()
  })

  it("renders colored text only in text mode", () => {
    render(<TagChipView meta={meta({ displayMode: "text", name: "Revanche", color: "#ec4899" })} />)
    const el = screen.getByText("Revanche")
    // jsdom normalizes hex → rgb
    expect(el.getAttribute("style")).toContain("rgb(236, 72, 153)")
  })
})
