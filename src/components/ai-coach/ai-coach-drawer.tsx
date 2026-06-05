"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Loader2, Minus, Maximize2, Minimize2, GripHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/ui/markdown"

type Message = {
  id:      string
  role:    "user" | "assistant"
  content: string
}

type ApiError = "NO_API_KEY" | "UNAUTHORIZED" | "BAD_REQUEST" | null

/** panel = floating window · expanded = wide · minimized = collapsed header bar */
type ViewMode = "panel" | "expanded" | "minimized"

const POS_KEY = "tj-coach-pos"

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

export function AiCoachDrawer() {
  const [open,       setOpen]       = useState(false)
  const [mode,       setMode]       = useState<ViewMode>("panel")
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState("")
  const [streaming,  setStreaming]  = useState(false)
  const [apiError,   setApiError]   = useState<ApiError>(null)
  const [pos,        setPos]        = useState<{ x: number; y: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const dragRef   = useRef<{ dx: number; dy: number } | null>(null)
  const isMobile  = useIsMobile()

  // Restore last floating position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY)
      if (saved) setPos(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id:      "welcome",
        role:    "assistant",
        content: "Hola, soy tu coach de trading. ¿En qué puedo ayudarte hoy? Puedo analizar tus patrones, revisar tu disciplina o darte consejos basados en tus datos reales.",
      }])
    }
  }, [open, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  useEffect(() => {
    if (open && mode !== "minimized") inputRef.current?.focus()
  }, [open, mode])

  // ── Dragging (desktop only) ──────────────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return
    const x = e.clientX - dragRef.current.dx
    const y = e.clientY - dragRef.current.dy
    const clampedX = Math.max(8, Math.min(window.innerWidth - 80, x))
    const clampedY = Math.max(8, Math.min(window.innerHeight - 80, y))
    setPos({ x: clampedX, y: clampedY })
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    document.removeEventListener("pointermove", onPointerMove)
    document.removeEventListener("pointerup", onPointerUp)
    setPos(p => {
      if (p) try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
      return p
    })
  }, [onPointerMove])

  function startDrag(e: React.PointerEvent) {
    if (isMobile) return
    const panel = (e.currentTarget as HTMLElement).closest("[data-coach-panel]") as HTMLElement | null
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput("")
    setStreaming(true)
    setApiError(null)

    const apiMessages = history
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch("/api/ai-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
      })

      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        const json = await res.json() as { error?: string }
        if (json.error === "NO_API_KEY")     { setApiError("NO_API_KEY");     setStreaming(false); return }
        if (json.error === "UNAUTHORIZED")   { setApiError("UNAUTHORIZED");   setStreaming(false); return }
        setApiError("BAD_REQUEST"); setStreaming(false); return
      }

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) { setStreaming(false); return }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m),
        )
      }
    } catch {
      setApiError("BAD_REQUEST")
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  // ── Floating launcher (collapsed) ─────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMode("panel") }}
        aria-label="Abrir AI Coach"
        className={cn(
          "fixed z-[55] w-14 h-14 rounded-full shadow-[var(--shadow-lg)] flex items-center justify-center",
          "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-colors",
        )}
        style={{ bottom: isMobile ? 132 : 96, right: 24 }}
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  // ── Geometry ──────────────────────────────────────────────────────────────
  const expanded = mode === "expanded"
  const minimized = mode === "minimized"

  const desktopStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 24, bottom: 24 }

  const width  = isMobile ? "100vw" : expanded ? "min(720px, 95vw)" : 400
  const height = minimized ? "auto" : isMobile ? "85dvh" : expanded ? "min(720px, 85vh)" : 560

  return (
    <div
      data-coach-panel
      className={cn(
        "fixed z-[55] flex flex-col bg-[var(--panel)] border border-[var(--line)] overflow-hidden",
        isMobile ? "left-0 right-0 bottom-0 rounded-t-[var(--radius-lg)]" : "rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
      )}
      style={isMobile
        ? { width, height: minimized ? "auto" : height }
        : { ...desktopStyle, width, height }}
    >
      {/* Header (drag handle on desktop) */}
      <div
        onPointerDown={startDrag}
        className={cn(
          "flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)] shrink-0 select-none",
          !isMobile && "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isMobile && <GripHorizontal size={14} className="text-[var(--ink-3)] shrink-0" />}
          <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
            <MessageCircle size={15} className="text-[var(--accent-contrast)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">AI Coach</p>
            <p className="text-[10px] text-[var(--ink-3)] leading-tight truncate">Basado en tus datos reales</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isMobile && (
            <button
              onClick={() => setMode(expanded ? "panel" : "expanded")}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              aria-label={expanded ? "Reducir" : "Expandir"}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          <button
            onClick={() => setMode(minimized ? "panel" : "minimized")}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            aria-label={minimized ? "Restaurar" : "Minimizar"}
          >
            {minimized ? <Maximize2 size={15} /> : <Minus size={16} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] hover:bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
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

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-[var(--radius)] px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "self-end bg-[var(--accent)] text-[var(--accent-contrast)] whitespace-pre-wrap"
                    : "self-start bg-[var(--panel-2)] text-[var(--ink)] border border-[var(--line)]",
                )}
              >
                {m.role === "assistant"
                  ? (m.content
                      ? <Markdown content={m.content} />
                      : (streaming ? <Loader2 size={14} className="animate-spin" /> : null))
                  : m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[var(--line)] px-3 py-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="Pregunta algo sobre tu trading…"
              rows={1}
              style={{ resize: "none", minHeight: 36, maxHeight: 120 }}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)]",
                "px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
                "disabled:opacity-50",
              )}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || streaming}
              className={cn(
                "w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0",
                "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
              aria-label="Enviar mensaje"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
