"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id:      string
  role:    "user" | "assistant"
  content: string
}

type ApiError = "NO_API_KEY" | "UNAUTHORIZED" | "BAD_REQUEST" | null

export function AiCoachDrawer() {
  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState("")
  const [streaming,  setStreaming]  = useState(false)
  const [apiError,   setApiError]   = useState<ApiError>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

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
    if (open) inputRef.current?.focus()
  }, [open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput("")
    setStreaming(true)
    setApiError(null)

    // Prepare conversation for API (exclude welcome message role artefacts)
    const apiMessages = history
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch("/api/ai-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
      })

      // Check for JSON error response
      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        const json = await res.json() as { error?: string }
        if (json.error === "NO_API_KEY") {
          setApiError("NO_API_KEY")
          setStreaming(false)
          return
        }
        if (json.error === "UNAUTHORIZED") {
          setApiError("UNAUTHORIZED")
          setStreaming(false)
          return
        }
        setApiError("BAD_REQUEST")
        setStreaming(false)
        return
      }

      // Stream text response
      const assistantId = crypto.randomUUID()
      setMessages((prev: Message[]) => [...prev, { id: assistantId, role: "assistant", content: "" }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setStreaming(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev: Message[]) =>
          prev.map((m: Message) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        )
      }
    } catch {
      setApiError("BAD_REQUEST")
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir AI Coach"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
          "bg-[#4f6ef7] text-white hover:bg-[#3d5ce6] transition-colors",
          open && "hidden",
        )}
      >
        <MessageCircle size={24} />
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position:  "fixed",
          bottom:    0,
          right:     0,
          width:     "min(420px, 100vw)",
          height:    "min(600px, 100dvh)",
          zIndex:    50,
          display:   open ? "flex" : "none",
          flexDirection: "column",
          borderRadius: "var(--radius) var(--radius) 0 0",
          overflow:  "hidden",
        }}
        className="bg-[var(--panel)] border border-[var(--line)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#4f6ef7] flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">AI Coach</p>
              <p className="text-[10px] text-[var(--ink-3)]">Basado en tus datos reales</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--panel-2)] transition-colors text-[var(--ink-3)]"
            aria-label="Cerrar coach"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {apiError === "NO_API_KEY" && (
            <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink-3)]">
              <strong className="text-[var(--ink)]">Configuración pendiente.</strong>
              {" "}Configura <code className="font-mono text-xs bg-[var(--chip)] px-1 rounded">ANTHROPIC_API_KEY</code> para activar el coach.
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-[var(--radius)] px-3 py-2 text-sm",
                m.role === "user"
                  ? "self-end bg-[#4f6ef7] text-white"
                  : "self-start bg-[var(--panel-2)] text-[var(--ink)]",
              )}
            >
              {m.content || (streaming && m.role === "assistant" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null)}
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
              "focus:outline-none focus:ring-1 focus:ring-[#4f6ef7]",
              "disabled:opacity-50",
            )}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || streaming}
            className={cn(
              "w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0",
              "bg-[#4f6ef7] text-white hover:bg-[#3d5ce6] transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Enviar mensaje"
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </>
  )
}
