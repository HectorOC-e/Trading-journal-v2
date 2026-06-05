"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard, CandlestickChart, ClipboardList, Brain, LineChart,
  Wallet, BookOpen, ShieldCheck, BarChart2, GraduationCap,
  ArrowDownToLine, Tag, User, Plus, Search, CornerDownLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuickActions } from "@/lib/quick-actions-store"

type Cmd = {
  id:    string
  label: string
  hint?: string
  icon:  React.ComponentType<{ size?: number | string }>
  run:   () => void
  keywords?: string
}

/**
 * Command palette (Fase 5 · E1). Open with ⌘K / Ctrl+K.
 * Navigate to any destination or trigger the global "Nuevo trade" flow.
 */
export function CommandPalette() {
  const router = useRouter()
  const openRegister = useQuickActions(s => s.openRegister)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const commands: Cmd[] = useMemo(() => {
    const go = (href: string) => () => { setOpen(false); router.push(href) }
    return [
      { id: "new-trade", label: "Nuevo trade", hint: "Acción", icon: Plus, run: () => { setOpen(false); openRegister() }, keywords: "registrar operacion crear" },
      { id: "dashboard",  label: "Dashboard",   icon: LayoutDashboard,  run: go("/dashboard") },
      { id: "trades",     label: "Trades",      icon: CandlestickChart, run: go("/trades") },
      { id: "reviews",    label: "Reviews",     icon: ClipboardList,    run: go("/reviews") },
      { id: "psicologia", label: "Psicología",  icon: Brain,            run: go("/psicologia"), keywords: "disciplina emociones" },
      { id: "analytics",  label: "Analytics",   icon: LineChart,        run: go("/analytics"),  keywords: "portfolio operador estadisticas" },
      { id: "cuentas",    label: "Cuentas",     icon: Wallet,           run: go("/cuentas") },
      { id: "playbook",   label: "Playbook",    icon: BookOpen,         run: go("/playbook"),   keywords: "setups" },
      { id: "reglas",     label: "Reglas",      icon: ShieldCheck,      run: go("/reglas") },
      { id: "mercados",   label: "Mercados",    icon: BarChart2,        run: go("/mercados") },
      { id: "aprendizaje",label: "Aprendizaje", icon: GraduationCap,    run: go("/aprendizaje"), keywords: "recursos learning" },
      { id: "retiros",    label: "Retiros",     icon: ArrowDownToLine,  run: go("/retiros") },
      { id: "etiquetas",  label: "Etiquetas",   icon: Tag,              run: go("/etiquetas") },
      { id: "perfil",     label: "Perfil y temas", icon: User,          run: go("/perfil"), keywords: "ajustes settings apariencia tema color" },
    ]
  }, [router, openRegister])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) || (c.keywords ?? "").toLowerCase().includes(q),
    )
  }, [query, commands])

  useEffect(() => { setActive(0) }, [query])

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.run() }
  }

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" })
  }, [active])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
      <div className="absolute inset-0 fade-in" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        className="relative w-full max-w-[560px] rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden scale-pop"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center gap-2 px-3.5 h-12 border-b border-[var(--line)]">
          <Search size={16} className="text-[var(--ink-3)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar destino o acción…"
            className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
          />
          <kbd className="text-[10px] font-medium text-[var(--ink-3)] border border-[var(--line)] rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--ink-3)]">Sin resultados</p>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon
              const isActive = i === active
              return (
                <button
                  key={c.id}
                  data-active={isActive}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => c.run()}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                    isActive ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--chip)]",
                  )}
                >
                  <Icon size={16} />
                  <span className={cn("flex-1 text-[13px]", isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--ink)]")}>
                    {c.label}
                  </span>
                  {c.hint && <span className="text-[10px] font-medium text-[var(--ink-3)] uppercase tracking-wide">{c.hint}</span>}
                  {isActive && <CornerDownLeft size={13} className="text-[var(--accent)]" />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
