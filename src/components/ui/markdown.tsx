"use client"

import { useMemo, useState, type ReactNode } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"
import { Info, Lightbulb, AlertTriangle, ShieldAlert, Target, TrendingUp, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Math (KaTeX) ───────────────────────────────────────────────────────────
// Render LaTeX the model emits ($$…$$, \[…\], \(…\), and guarded $…$) as real
// equations instead of raw "/2%&" text. throwOnError:false → a half-streamed or
// malformed expression degrades to its source rather than throwing.
function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex.trim(), { displayMode: display, throwOnError: false, output: "html" })
  } catch {
    return tex
  }
}

function MathBlock({ tex }: { tex: string }) {
  return <div className="my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderMath(tex, true) }} />
}

function MathInline({ tex }: { tex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderMath(tex, false) }} />
}

// A bare `$…$` is only math when it carries a LaTeX signal char; otherwise it is
// almost certainly currency ("gané $100 y perdí $50") and must stay literal.
const LATEX_SIGNAL = /[\\^_{}]/

// ─────────────────────────────────────────────────────────────────────────────
// Dependency-free Markdown renderer for AI-generated content.
// Supports: headings, bold/italic/strike/inline-code, links, ordered/unordered
// lists, checklists, blockquotes, fenced code, tables, horizontal rules, and
// callout blocks via GitHub-style `> [!TYPE]` and `:::type` fences:
//   [!NOTE] [!TIP] [!INSIGHT] [!WARNING] [!DANGER] [!RECOMMENDATION] [!METRIC]
// Renders so AI replies feel like Notion / Linear / ChatGPT — not a textarea.
// ─────────────────────────────────────────────────────────────────────────────

type CalloutType = "note" | "tip" | "insight" | "warning" | "danger" | "recommendation" | "metric"

const CALLOUT: Record<CalloutType, { icon: typeof Info; fg: string; bg: string; label: string }> = {
  note:           { icon: Info,           fg: "var(--accent)", bg: "var(--accent-soft)", label: "Nota" },
  tip:            { icon: Lightbulb,      fg: "var(--win)",    bg: "var(--win-soft)",    label: "Tip" },
  insight:        { icon: TrendingUp,     fg: "var(--accent)", bg: "var(--accent-soft)", label: "Insight" },
  warning:        { icon: AlertTriangle,  fg: "var(--be)",     bg: "var(--be-soft)",     label: "Atención" },
  danger:         { icon: ShieldAlert,    fg: "var(--loss)",   bg: "var(--loss-soft)",   label: "Riesgo" },
  recommendation: { icon: Target,         fg: "var(--win)",    bg: "var(--win-soft)",    label: "Recomendación" },
  metric:         { icon: TrendingUp,     fg: "var(--ink)",    bg: "var(--panel-2)",     label: "Métrica" },
}

const CALLOUT_ALIASES: Record<string, CalloutType> = {
  note: "note", info: "note", tip: "tip", success: "tip", insight: "insight",
  warning: "warning", caution: "warning", danger: "danger", error: "danger",
  recommendation: "recommendation", rec: "recommendation", action: "recommendation",
  metric: "metric", kpi: "metric",
}

// ── Inline ────────────────────────────────────────────────────────────────────
// Order matters: math (\(…\) and $…$) and inline code are matched before emphasis
// so a `_` or `*` inside an equation/code isn't mistaken for italics.
const INLINE_RE = /(<br\s*\/?>|\\\([^\n]+?\\\)|\$[^$\n]+\$|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)\s]+\))/gi

function safeHref(url: string): string | null {
  const u = url.trim()
  if (/^(https?:|mailto:)/i.test(u)) return u
  if (u.startsWith("/")) return u
  return null
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, i = 0
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const k = `${keyPrefix}-${i++}`
    if (/^<br/i.test(tok)) out.push(<br key={k} />)
    else if (tok.startsWith("\\(")) out.push(<MathInline key={k} tex={tok.slice(2, -2)} />)
    else if (tok.startsWith("$")) {
      const inner = tok.slice(1, -1)
      if (LATEX_SIGNAL.test(inner)) out.push(<MathInline key={k} tex={inner} />)
      else out.push(tok) // currency / plain — keep literal
    }
    else if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith("~~")) out.push(<del key={k} className="opacity-70">{tok.slice(2, -2)}</del>)
    else if (tok.startsWith("`")) out.push(<code key={k} className="px-1 py-0.5 rounded text-[0.85em] font-mono" style={{ background: "var(--chip)", color: "var(--ink)" }}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok)
      const href = mm ? safeHref(mm[2]) : null
      if (mm && href) out.push(<a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>{mm[1]}</a>)
      else out.push(tok)
    }
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// ── Block model ───────────────────────────────────────────────────────────────
type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: { text: string; checked?: boolean }[] }
  | { t: "ol"; items: string[] }
  | { t: "quote"; lines: string[] }
  | { t: "callout"; kind: CalloutType; title?: string; lines: string[] }
  | { t: "code"; lang?: string; code: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "math"; tex: string }
  | { t: "hr" }

function detectCallout(firstLine: string): { kind: CalloutType; title?: string } | null {
  const m = /^\[!(\w+)\]\s*(.*)$/.exec(firstLine.trim())
  if (!m) return null
  const kind = CALLOUT_ALIASES[m[1].toLowerCase()]
  if (!kind) return null
  return { kind, title: m[2]?.trim() || undefined }
}

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, "").split("|").map(c => c.trim())
}

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === "") { i++; continue }

    // Fenced code
    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim() || undefined
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++ }
      i++ // closing fence
      blocks.push({ t: "code", lang, code: buf.join("\n") })
      continue
    }

    // Block math: $$…$$ or \[…\] (single- or multi-line)
    const blockMath = /^(\$\$|\\\[)/.exec(trimmed)
    if (blockMath) {
      const open = blockMath[1]
      const close = open === "$$" ? "$$" : "\\]"
      // Single-line form, e.g. $$x = y$$
      const oneLine = open === "$$"
        ? /^\$\$(.+)\$\$$/.exec(trimmed)
        : /^\\\[(.+)\\\]$/.exec(trimmed)
      if (oneLine) { blocks.push({ t: "math", tex: oneLine[1] }); i++; continue }
      // Multi-line: collect until the closing delimiter
      const buf: string[] = [trimmed.slice(open.length)]
      i++
      while (i < lines.length && !lines[i].trim().endsWith(close)) { buf.push(lines[i]); i++ }
      if (i < lines.length) { buf.push(lines[i].trim().slice(0, -close.length)); i++ }
      blocks.push({ t: "math", tex: buf.join("\n") })
      continue
    }

    // ::: callout fence
    const fence = /^:::\s*(\w+)/.exec(trimmed)
    if (fence) {
      const kind = CALLOUT_ALIASES[fence[1].toLowerCase()] ?? "note"
      const buf: string[] = []
      i++
      while (i < lines.length && !/^:::/.test(lines[i].trim())) { buf.push(lines[i]); i++ }
      i++
      blocks.push({ t: "callout", kind, lines: buf })
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { blocks.push({ t: "hr" }); i++; continue }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (h) { blocks.push({ t: "h", level: h[1].length, text: h[2] }); i++; continue }

    // Blockquote / GitHub callout
    if (trimmed.startsWith(">")) {
      const qlines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        qlines.push(lines[i].trim().replace(/^>\s?/, "")); i++
      }
      const co = qlines.length > 0 ? detectCallout(qlines[0]) : null
      if (co) blocks.push({ t: "callout", kind: co.kind, title: co.title, lines: qlines.slice(1) })
      else blocks.push({ t: "quote", lines: qlines })
      continue
    }

    // Table: header row + separator
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const head = splitCells(trimmed)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") { rows.push(splitCells(lines[i].trim())); i++ }
      blocks.push({ t: "table", head, rows })
      continue
    }

    // Unordered list / checklist
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: { text: string; checked?: boolean }[] = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const raw = lines[i].trim().replace(/^[-*+]\s+/, "")
        const chk = /^\[([ xX])\]\s+(.*)$/.exec(raw)
        if (chk) items.push({ text: chk[2], checked: chk[1].toLowerCase() === "x" })
        else items.push({ text: raw })
        i++
      }
      blocks.push({ t: "ul", items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, "")); i++ }
      blocks.push({ t: "ol", items })
      continue
    }

    // Paragraph (gather consecutive plain lines)
    const buf: string[] = [trimmed]
    i++
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```|:::|\||\$\$|\\\[)/.test(lines[i].trim())) {
      buf.push(lines[i].trim()); i++
    }
    blocks.push({ t: "p", text: buf.join(" ") })
  }
  return blocks
}

// ── Render ────────────────────────────────────────────────────────────────────
function Callout({ kind, title, lines }: { kind: CalloutType; title?: string; lines: string[] }) {
  const c = CALLOUT[kind]; const Icon = c.icon
  return (
    <div className="rounded-[var(--radius)] border px-3.5 py-2.5 my-2" style={{ borderColor: c.fg, background: c.bg }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: c.fg }}>
        <Icon size={14} className="shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wide">{title || c.label}</span>
      </div>
      <div className="text-[13px] leading-relaxed" style={{ color: "var(--ink)" }}>
        {lines.filter(l => l.trim() !== "").map((l, j) => <p key={j} className="mb-1 last:mb-0">{parseInline(l, `co-${j}`)}</p>)}
      </div>
    </div>
  )
}

// ── Code block: language label + copy + light dependency-free highlight ───────
const CODE_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "import",
  "from", "export", "default", "class", "new", "await", "async", "true", "false", "null",
  "undefined", "def", "print", "in", "not", "and", "or", "lambda", "try", "except",
  "SELECT", "FROM", "WHERE", "JOIN", "GROUP", "ORDER", "BY", "LIMIT", "AS", "ON",
])
const CODE_TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g

function highlightCode(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, i = 0
  CODE_TOKEN_RE.lastIndex = 0
  while ((m = CODE_TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const k = i++
    if (m[1])      out.push(<span key={k} style={{ color: "var(--ink-3)", fontStyle: "italic" }}>{m[1]}</span>)
    else if (m[2]) out.push(<span key={k} style={{ color: "var(--win)" }}>{m[2]}</span>)
    else if (m[3]) out.push(<span key={k} style={{ color: "var(--be)" }}>{m[3]}</span>)
    else if (m[4]) out.push(CODE_KEYWORDS.has(m[4])
      ? <span key={k} style={{ color: "var(--accent)", fontWeight: 600 }}>{m[4]}</span>
      : m[4])
    last = m.index + m[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ }
  }
  return (
    <div className="my-2 rounded-[var(--radius)] overflow-hidden border" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--panel-2)", borderBottom: "1px solid var(--line)" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{lang || "code"}</span>
        <button onClick={copy} className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-90" aria-label="Copiar código" title="Copiar">
          {copied ? <Check size={12} className="text-[var(--win)]" /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[12px]" style={{ background: "var(--panel-2)" }}>
        <code className="font-mono" style={{ color: "var(--ink)" }}>{highlightCode(code)}</code>
      </pre>
    </div>
  )
}

const HEADING_CLASS = ["", "text-[18px] font-bold mt-3 mb-1.5", "text-[16px] font-bold mt-3 mb-1.5", "text-[14px] font-semibold mt-2.5 mb-1", "text-[13px] font-semibold mt-2 mb-1", "text-[12px] font-semibold mt-2 mb-1", "text-[12px] font-semibold mt-2 mb-1"]

function Heading({ level, children }: { level: number; children: ReactNode }) {
  const cls = HEADING_CLASS[Math.min(6, level)]
  const style = { color: "var(--ink)" } as const
  switch (Math.min(6, level)) {
    case 1: return <h1 className={cls} style={style}>{children}</h1>
    case 2: return <h2 className={cls} style={style}>{children}</h2>
    case 3: return <h3 className={cls} style={style}>{children}</h3>
    case 4: return <h4 className={cls} style={style}>{children}</h4>
    case 5: return <h5 className={cls} style={style}>{children}</h5>
    default: return <h6 className={cls} style={style}>{children}</h6>
  }
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(content ?? ""), [content])
  return (
    <div className={cn("text-[13px] leading-relaxed", className)} style={{ color: "var(--ink)" }}>
      {blocks.map((b, idx) => {
        switch (b.t) {
          case "h":
            return <Heading key={idx} level={b.level}>{parseInline(b.text, `h${idx}`)}</Heading>
          case "p":
            return <p key={idx} className="my-1.5">{parseInline(b.text, `p${idx}`)}</p>
          case "ul":
            return (
              <ul key={idx} className="my-1.5 flex flex-col gap-1">
                {b.items.map((it, j) => it.checked !== undefined ? (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 text-[10px]"
                      style={{ borderColor: it.checked ? "var(--win)" : "var(--line-2)", background: it.checked ? "var(--win)" : "transparent", color: "#fff" }}>
                      {it.checked ? "✓" : ""}
                    </span>
                    <span className={it.checked ? "opacity-60 line-through" : ""}>{parseInline(it.text, `li${idx}-${j}`)}</span>
                  </li>
                ) : (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                    <span>{parseInline(it.text, `li${idx}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
          case "ol":
            return (
              <ol key={idx} className="my-1.5 flex flex-col gap-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="num text-[12px] font-semibold shrink-0 mt-px" style={{ color: "var(--accent)" }}>{j + 1}.</span>
                    <span>{parseInline(it, `oli${idx}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            )
          case "quote":
            return (
              <blockquote key={idx} className="my-2 pl-3 border-l-2 italic" style={{ borderColor: "var(--line-2)", color: "var(--ink-2)" }}>
                {b.lines.map((l, j) => <p key={j}>{parseInline(l, `q${idx}-${j}`)}</p>)}
              </blockquote>
            )
          case "callout":
            return <Callout key={idx} kind={b.kind} title={b.title} lines={b.lines} />
          case "code":
            return <CodeBlock key={idx} lang={b.lang} code={b.code} />
          case "table":
            return (
              <div key={idx} className="my-2 overflow-x-auto rounded-[var(--radius)] border" style={{ borderColor: "var(--line)" }}>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j} className="text-left font-bold py-1.5 px-2.5" style={{ background: "var(--panel-2)", color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>{parseInline(h, `th${idx}-${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>{r.map((c, ci) => <td key={ci} className="py-1.5 px-2.5" style={{ borderTop: "1px solid var(--line)", color: "var(--ink-2)" }}>{parseInline(c, `td${idx}-${ri}-${ci}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case "math":
            return <MathBlock key={idx} tex={b.tex} />
          case "hr":
            return <hr key={idx} className="my-3" style={{ border: "none", borderTop: "1px solid var(--line)" }} />
        }
      })}
    </div>
  )
}
