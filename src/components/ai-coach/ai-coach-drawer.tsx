"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Square, Minus, Maximize2, Minimize2, GripHorizontal, Wrench, Copy, Check, RotateCcw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/ui/markdown"
import { STORAGE_KEYS } from "@/lib/storage-keys"
import { useAnyDialogOpen } from "@/lib/dialog-open-store"

type Message = {
  id:      string
  role:    "user" | "assistant"
  content: string
  ts?:     number      // epoch ms — shown as a small timestamp
  tools?:  string[]    // coach tools consulted while producing this reply
}

// Friendly Spanish labels for the read-only coach tools (transparency chips).
const TOOL_LABELS: Record<string, string> = {
  get_account_detail: "consultó una cuenta",
  get_setup_detail:   "consultó un setup",
  search_trades:      "buscó en tus trades",
  get_trade_detail:   "revisó un trade",
  get_period_stats:   "calculó stats del periodo",
  semantic_search:    "búsqueda semántica en notas",
  get_learning_resources:    "revisó tus recursos de estudio",
  get_study_agenda:          "consultó tu agenda de estudio",
  suggest_study:             "cruzó tus debilidades con recursos",
  search_learning_resources: "búsqueda semántica en recursos",
}

// Starter prompts shown on an empty conversation.
const SUGGESTED = [
  "¿Cómo va mi disciplina esta semana?",
  "¿Cuál es mi peor patrón recurrente?",
  "¿Qué setup me está dando más edge?",
  "Analiza mis últimas operaciones perdedoras",
]

type ApiError = "NO_API_KEY" | "UNAUTHORIZED" | "BAD_REQUEST" | null

/** panel = floating window · expanded = wide · minimized = collapsed header bar */
type ViewMode = "panel" | "expanded" | "minimized"

type XY = { x: number; y: number }

const HISTORY_KEY  = STORAGE_KEYS.coachHistory

/** Keep the in-session drag anchor inside the viewport (e.g. after a resize). */
function clampPos(p: XY | null, w: number, h: number): XY | null {
  if (!p || typeof window === "undefined") return p
  return {
    x: Math.max(8, Math.min(window.innerWidth - w - 8, p.x)),
    y: Math.max(8, Math.min(window.innerHeight - h - 8, p.y)),
  }
}

const WELCOME: Message = {
  id:      "welcome",
  role:    "assistant",
  content: "Hola, soy tu coach de trading. ¿En qué puedo ayudarte hoy? Puedo analizar tus patrones, revisar tu disciplina o darte consejos basados en tus datos reales.",
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return mobile
}

function formatTime(ts?: number): string {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

export function AiCoachDrawer() {
  const [open,        setOpen]        = useState(false)
  const [mode,        setMode]        = useState<ViewMode>("panel")
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState("")
  const [streaming,   setStreaming]   = useState(false)
  const [apiError,    setApiError]    = useState<ApiError>(null)
  const [pos,         setPos]         = useState<XY | null>(null)
  const [copiedId,    setCopiedId]    = useState<string | null>(null)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const dragRef      = useRef<{ dx: number; dy: number } | null>(null)
  const sendRef      = useRef<(t?: string) => void>(() => {})
  const abortRef     = useRef<AbortController | null>(null)
  const isMobile     = useIsMobile()
  const anyDialogOpen = useAnyDialogOpen()

  // ── Mount: restore positions + conversation history ─────────────────────────
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY)
      if (h) {
        const parsed = JSON.parse(h) as Message[]
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // Seed the welcome message only when there's no restored history.
  useEffect(() => {
    if (open && messages.length === 0) setMessages([WELCOME])
  }, [open, messages.length])

  // Persist the conversation (skip the bare welcome-only state).
  useEffect(() => {
    try {
      if (messages.length > 1 || (messages[0] && messages[0].id !== "welcome")) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(messages))
      }
    } catch { /* ignore */ }
  }, [messages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streaming])
  useEffect(() => { if (open && mode !== "minimized") inputRef.current?.focus() }, [open, mode])

  // ── Panel dragging (desktop + mobile) ───────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return
    const x = e.clientX - dragRef.current.dx
    const y = e.clientY - dragRef.current.dy
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 80, x)),
      y: Math.max(8, Math.min(window.innerHeight - 80, y)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    document.removeEventListener("pointermove", onPointerMove)
    document.removeEventListener("pointerup", onPointerUp)
  }, [onPointerMove])

  function startDrag(e: React.PointerEvent) {
    const panel = (e.currentTarget as HTMLElement).closest("[data-coach-panel]") as HTMLElement | null
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }

  // Close = forget any in-session drag, so the chat always reopens at its home
  // position (bottom-right). The drag is only to temporarily uncover data.
  function closeCoach() {
    setOpen(false)
    setPos(null)
    setMode("panel")
  }

  // ── Streaming core (shared by send + regenerate) ────────────────────────────
  async function streamReply(history: Message[]) {
    setStreaming(true)
    setApiError(null)

    const apiMessages = history
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }))

    const controller = new AbortController()
    abortRef.current = controller

    const assistantId = crypto.randomUUID()
    try {
      const res = await fetch("/api/ai-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
        signal:  controller.signal,
      })

      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        const json = await res.json() as { error?: string }
        if (json.error === "NO_API_KEY")   { setApiError("NO_API_KEY");   return }
        if (json.error === "UNAUTHORIZED") { setApiError("UNAUTHORIZED"); return }
        setApiError("BAD_REQUEST"); return
      }

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", ts: Date.now() }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      // The stream interleaves answer text with NUL-framed tool events
      // (\0{"tool":"…"}\0). Buffer across reads so a marker split between chunks
      // is never rendered as raw text.
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        let text = ""
        const newTools: string[] = []
        for (;;) {
          const start = buf.indexOf("\0")
          if (start === -1) { text += buf; buf = ""; break }
          text += buf.slice(0, start)
          const end = buf.indexOf("\0", start + 1)
          if (end === -1) { buf = buf.slice(start); break } // wait for marker's rest
          try {
            const ev = JSON.parse(buf.slice(start + 1, end)) as { tool?: string }
            if (ev.tool) newTools.push(ev.tool)
          } catch { /* ignore malformed marker */ }
          buf = buf.slice(end + 1)
        }

        if (text || newTools.length) {
          setMessages(prev => prev.map(m => m.id === assistantId
            ? { ...m, content: m.content + text, tools: [...(m.tools ?? []), ...newTools] }
            : m))
        }
      }
    } catch (err) {
      // AbortError = user pressed Stop; keep whatever streamed so far.
      if ((err as Error)?.name !== "AbortError") setApiError("BAD_REQUEST")
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function sendMessage(textArg?: string) {
    const text = (textArg ?? input).trim()
    if (!text || streaming) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput("")
    void streamReply(history)
  }

  function regenerate() {
    if (streaming) return
    const trimmed = [...messages]
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop()
    if (!trimmed.some(m => m.role === "user")) return
    setMessages(trimmed)
    void streamReply(trimmed)
  }

  function stopGenerating() { abortRef.current?.abort() }

  function newChat() {
    if (streaming) abortRef.current?.abort()
    setMessages([WELCOME])
    setInput("")
    setApiError(null)
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
    inputRef.current?.focus()
  }

  async function copyMessage(m: Message) {
    try {
      await navigator.clipboard.writeText(m.content)
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(c => (c === m.id ? null : c)), 1500)
    } catch { /* clipboard blocked */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage() }
  }

  // Keep a live ref so the once-attached coach:ask listener calls the latest closure.
  sendRef.current = sendMessage
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question
      if (!q) return
      setOpen(true)
      setMode("panel")
      setTimeout(() => sendRef.current(q), 50)
    }
    window.addEventListener("coach:ask", handler)
    return () => window.removeEventListener("coach:ask", handler)
  }, [])

  // While any modal is open, stay out of the way — a fixed FAB/panel would sit
  // on top of the dialog and cover its content and actions (mobile + desktop).
  if (anyDialogOpen) return null

  // ── Floating launcher (collapsed) — fixed home position (bottom-right corner,
  // below the quick-actions FAB which stacks above it on desktop). ──────────────
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMode("panel") }}
        aria-label="Abrir AI Coach"
        className={cn(
          "fixed z-[45] w-14 h-14 rounded-full shadow-[var(--shadow-lg)] flex items-center justify-center",
          "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-colors active:scale-95",
        )}
        style={{ bottom: isMobile ? 84 : 24, right: 24 }}
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  // ── Geometry ──────────────────────────────────────────────────────────────
  const expanded  = mode === "expanded"
  const minimized = mode === "minimized"
  const sheet     = isMobile && !pos // mobile bottom-sheet only when not custom-positioned

  // Clamp the saved anchor so the panel never reopens off-screen (keep ~80px on screen).
  const pp = clampPos(pos, 80, 80)
  const posStyle: React.CSSProperties = pp
    ? { left: pp.x, top: pp.y, right: "auto", bottom: "auto" }
    : sheet ? {} : { right: 24, bottom: 24 }

  const width  = sheet ? "100vw" : expanded ? "min(720px, 95vw)" : isMobile ? "min(400px, 95vw)" : 400
  const height = minimized ? "auto" : sheet ? "85dvh" : expanded ? "min(720px, 85vh)" : 560

  return (
    <div
      data-coach-panel
      className={cn(
        "fixed z-[55] flex flex-col bg-[var(--panel)] border border-[var(--line)] overflow-hidden",
        sheet ? "left-0 right-0 bottom-0 rounded-t-[var(--radius-lg)]" : "rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
      )}
      style={{ ...posStyle, width, height }}
    >
      {/* Header (drag handle) */}
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)] shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal size={14} className="text-[var(--ink-3)] shrink-0" />
          <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
            <MessageCircle size={15} className="text-[var(--accent-contrast)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">AI Coach</p>
            <p className="text-[10px] text-[var(--ink-3)] leading-tight truncate">Basado en tus datos reales</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
          {!minimized && messages.length > 1 && (
            <button
              onClick={newChat}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--loss-soft)] text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors active:scale-95"
              aria-label="Borrar conversación"
              title="Borrar conversación"
            >
              <Trash2 size={15} />
            </button>
          )}
          {/* Expand/contract — hidden while minimized (that's what caused the
              duplicate 'ampliar' button next to Restore). */}
          {!isMobile && !minimized && (
            <button
              onClick={() => setMode(expanded ? "panel" : "expanded")}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-95"
              aria-label={expanded ? "Reducir" : "Expandir"}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          <button
            onClick={() => setMode(minimized ? "panel" : "minimized")}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-95"
            aria-label={minimized ? "Restaurar" : "Minimizar"}
          >
            {minimized ? <Maximize2 size={15} /> : <Minus size={16} />}
          </button>
          <button
            onClick={closeCoach}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-95"
            aria-label="Cerrar coach"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {apiError === "NO_API_KEY" && (
              <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink-3)]">
                <strong className="text-[var(--ink)]">Configuración pendiente.</strong>
                {" "}Ve a <strong className="text-[var(--ink)]">Perfil → Configuración de IA</strong>, añade la API key de tu proveedor y verifícala con <strong className="text-[var(--ink)]">Probar conexión</strong>.
              </div>
            )}
            {apiError === "UNAUTHORIZED" && (
              <div className="rounded-[var(--radius)] border border-[var(--loss)]/40 bg-[var(--loss-soft)] px-4 py-3 text-sm text-[var(--loss)]">
                Sesión expirada. Vuelve a iniciar sesión.
              </div>
            )}

            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1
              const isAssistant = m.role === "assistant"
              const showTyping = isAssistant && isLast && streaming && m.content === ""
              return (
                <div key={m.id} className={cn("flex flex-col gap-1", isAssistant ? "items-start" : "items-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[var(--radius)] px-3 py-2 text-sm leading-relaxed",
                      isAssistant
                        ? "bg-[var(--panel-2)] text-[var(--ink)] border border-[var(--line)]"
                        : "bg-[var(--accent)] text-[var(--accent-contrast)] whitespace-pre-wrap",
                    )}
                  >
                    {isAssistant
                      ? (m.content
                          ? <Markdown content={m.content} />
                          : showTyping
                            ? <TypingIndicator consulting={(m.tools?.length ?? 0) > 0} />
                            : null)
                      : m.content}

                    {isAssistant && m.tools && m.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {[...new Set(m.tools)].map(t => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--ink-3)]"
                            title={`El coach ${TOOL_LABELS[t] ?? t}`}
                          >
                            <Wrench size={9} />
                            {TOOL_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta row: timestamp + actions (copy / regenerate) */}
                  <div className="flex items-center gap-2 px-1 h-4">
                    {m.ts && <span className="text-[10px] text-[var(--ink-3)] tabular-nums">{formatTime(m.ts)}</span>}
                    {isAssistant && m.id !== "welcome" && m.content && (
                      <>
                        <button
                          onClick={() => copyMessage(m)}
                          className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-90"
                          aria-label="Copiar respuesta"
                          title="Copiar"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-[var(--win)]" /> : <Copy size={12} />}
                        </button>
                        {isLast && !streaming && (
                          <button
                            onClick={regenerate}
                            className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-90"
                            aria-label="Regenerar respuesta"
                            title="Regenerar"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Typing indicator for the gap between sending and the assistant
                placeholder being created (so the dots show the instant the stop
                button appears). */}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex flex-col gap-1 items-start">
                <div className="max-w-[85%] rounded-[var(--radius)] px-3 py-2 bg-[var(--panel-2)] border border-[var(--line)]">
                  <TypingIndicator consulting={false} />
                </div>
              </div>
            )}

            {/* Suggested starter prompts (empty conversation) */}
            {messages.length <= 1 && !streaming && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SUGGESTED.map(s => (
                  <button
                    key={s}
                    onClick={() => void sendMessage(s)}
                    className="text-[12px] px-2.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors active:scale-[0.97] text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[var(--line)] px-3 py-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta algo sobre tu trading…"
              rows={1}
              style={{ resize: "none", minHeight: 36, maxHeight: 120 }}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)]",
                "px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
              )}
            />
            <button
              onClick={() => (streaming ? stopGenerating() : void sendMessage())}
              disabled={!streaming && !input.trim()}
              className={cn(
                "w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-[background-color,transform] active:scale-95",
                streaming
                  ? "bg-[var(--loss-soft)] text-[var(--loss)] hover:bg-[var(--loss)] hover:text-white"
                  : "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] disabled:opacity-40 disabled:cursor-not-allowed",
              )}
              aria-label={streaming ? "Detener generación" : "Enviar mensaje"}
            >
              {streaming ? <Square size={15} className="fill-current" /> : <Send size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Typing indicator: three bouncing dots + contextual label ──────────────────
function TypingIndicator({ consulting }: { consulting: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5" aria-live="polite">
      <div className="flex items-center gap-1">
        <span className="coach-dot" />
        <span className="coach-dot" />
        <span className="coach-dot" />
      </div>
      <span className="text-[12px] text-[var(--ink-3)]">
        {consulting ? "consultando tus datos…" : "El coach está pensando…"}
      </span>
    </div>
  )
}
