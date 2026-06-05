import { describe, it, expect } from "vitest"
import { parseBlocks } from "@/components/ui/markdown"

describe("markdown parseBlocks", () => {
  it("parses headings, paragraphs and lists", () => {
    const blocks = parseBlocks("# Title\n\nSome **text**.\n\n- a\n- b")
    expect(blocks[0]).toMatchObject({ t: "h", level: 1, text: "Title" })
    expect(blocks[1]).toMatchObject({ t: "p" })
    expect(blocks[2].t).toBe("ul")
  })

  it("parses checklists", () => {
    const blocks = parseBlocks("- [x] done\n- [ ] pending")
    expect(blocks[0].t).toBe("ul")
    const ul = blocks[0] as { t: "ul"; items: { text: string; checked?: boolean }[] }
    expect(ul.items[0].checked).toBe(true)
    expect(ul.items[1].checked).toBe(false)
  })

  it("parses ordered lists", () => {
    const blocks = parseBlocks("1. first\n2. second")
    expect(blocks[0].t).toBe("ol")
  })

  it("parses GitHub-style callouts", () => {
    const blocks = parseBlocks("> [!WARNING] Cuidado\n> texto de aviso")
    expect(blocks[0]).toMatchObject({ t: "callout", kind: "warning" })
  })

  it("parses ::: fenced callouts", () => {
    const blocks = parseBlocks(":::recommendation\nHaz esto\n:::")
    expect(blocks[0]).toMatchObject({ t: "callout", kind: "recommendation" })
  })

  it("parses fenced code blocks", () => {
    const blocks = parseBlocks("```js\nconst x = 1\n```")
    expect(blocks[0]).toMatchObject({ t: "code", lang: "js" })
  })

  it("parses tables", () => {
    const blocks = parseBlocks("| A | B |\n|---|---|\n| 1 | 2 |")
    expect(blocks[0].t).toBe("table")
    const tbl = blocks[0] as { t: "table"; head: string[]; rows: string[][] }
    expect(tbl.head).toEqual(["A", "B"])
    expect(tbl.rows[0]).toEqual(["1", "2"])
  })

  it("parses blockquotes", () => {
    const blocks = parseBlocks("> just a quote\n> second line")
    expect(blocks[0].t).toBe("quote")
  })
})
