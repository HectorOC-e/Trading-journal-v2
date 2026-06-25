import { describe, it, expect } from "vitest"
import { suggestTagsFromNote } from "@/domains/trading/services/note-tag-suggester"

describe("suggestTagsFromNote — deterministic auto-tagging of notes (#37)", () => {
  it("suggests FOMO from chasing language", () => {
    expect(suggestTagsFromNote("Entré tarde por FOMO, no quería perdérmelo")).toContain("FOMO")
  })
  it("suggests Duda from hesitation language", () => {
    expect(suggestTagsFromNote("No estaba seguro, dudé mucho antes de entrar")).toContain("Duda")
  })
  it("suggests Revancha from revenge language", () => {
    expect(suggestTagsFromNote("Quería recuperar lo perdido de inmediato")).toContain("Revancha")
  })
  it("suggests Off-plan when the plan was broken", () => {
    expect(suggestTagsFromNote("Me salté el plan y entré sin confirmación")).toContain("Off-plan")
  })
  it("returns no suggestions for a neutral note", () => {
    expect(suggestTagsFromNote("Entrada limpia en soporte, gestión normal")).toEqual([])
  })
  it("returns an empty array for an empty note", () => {
    expect(suggestTagsFromNote("")).toEqual([])
    expect(suggestTagsFromNote("   ")).toEqual([])
  })
  it("dedupes and never suggests more than three tags", () => {
    const r = suggestTagsFromNote("FOMO, dudé, revancha, fuera de plan, codicia total")
    expect(new Set(r).size).toBe(r.length)
    expect(r.length).toBeLessThanOrEqual(3)
  })
})