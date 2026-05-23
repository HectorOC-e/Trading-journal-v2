"use client"

// Reusable market picker components — single (SymbolCombobox) and multi (MarketMultiSelect)

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketOption {
  id: string
  symbol: string
  name: string
  category: string
}

// ── Shared list ────────────────────────────────────────────────────────────

function MarketList({
  markets,
  query,
  selected,
  onToggle,
  multi,
}: {
  markets: MarketOption[]
  query: string
  selected: Set<string>
  onToggle: (symbol: string) => void
  multi: boolean
}) {
  const filtered = query.trim()
    ? markets.filter(m =>
        m.symbol.toLowerCase().includes(query.toLowerCase()) ||
        m.name.toLowerCase().includes(query.toLowerCase())
      )
    : markets

  if (filtered.length === 0) {
    return <p className="py-6 text-center text-xs text-[var(--ink-3)]">Sin resultados</p>
  }

  // Group by category
  const grouped = new Map<string, MarketOption[]>()
  for (const m of filtered) {
    const arr = grouped.get(m.category) ?? []
    arr.push(m)
    grouped.set(m.category, arr)
  }

  return (
    <div>
      {Array.from(grouped.entries()).map(([cat, items]) => (
        <div key={cat}>
          <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-3)] sticky top-0 bg-[var(--panel)]">
            {cat}
          </p>
          {items.map(m => {
            const active = selected.has(m.symbol)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.symbol)}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[var(--chip)] transition-colors",
                  active && "bg-[var(--accent-soft)]"
                )}
              >
                {multi && (
                  <span className={cn(
                    "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[var(--line)]"
                  )}>
                    {active && <Check size={10} className="text-white" />}
                  </span>
                )}
                <span className={cn(
                  "text-xs font-bold w-12 shrink-0",
                  active ? "text-[var(--accent)]" : "text-[var(--ink)]"
                )}>
                  {m.symbol}
                </span>
                <span className="text-[11px] text-[var(--ink-3)] truncate">{m.name}</span>
                {!multi && active && (
                  <Check size={12} className="ml-auto text-[var(--accent)] shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Dropdown wrapper ────────────────────────────────────────────────────────

function Dropdown({
  open,
  markets,
  selected,
  onToggle,
  multi,
  onClose,
}: {
  open: boolean
  markets: MarketOption[]
  selected: Set<string>
  onToggle: (symbol: string) => void
  multi: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] shadow-lg flex flex-col"
      style={{ maxHeight: 280 }}>
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--line)] shrink-0">
        <Search size={12} className="text-[var(--ink-3)] shrink-0" />
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar símbolo…"
          className="flex-1 bg-transparent text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[var(--ink-3)] hover:text-[var(--ink)]">
            <X size={10} />
          </button>
        )}
      </div>
      {/* List */}
      <div className="overflow-y-auto flex-1">
        <MarketList markets={markets} query={query} selected={selected} onToggle={onToggle} multi={multi} />
      </div>
    </div>
  )
}

// ══ SymbolCombobox — single-select ══════════════════════════════════════════

interface SymbolComboboxProps {
  markets: MarketOption[]
  value: string
  onChange: (symbol: string) => void
  placeholder?: string
  className?: string
}

export function SymbolCombobox({
  markets,
  value,
  onChange,
  placeholder = "Seleccionar símbolo…",
  className,
}: SymbolComboboxProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = new Set(value ? [value] : [])

  const handleToggle = useCallback((symbol: string) => {
    onChange(symbol)
    setOpen(false)
  }, [onChange])

  const closeDropdown = useCallback(() => setOpen(false), [])

  // Click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const selectedMarket = markets.find(m => m.symbol === value)

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center justify-between w-full h-9 px-3 rounded-[var(--radius-sm)] border text-left transition-colors",
          open
            ? "border-[var(--accent)] bg-[var(--panel)]"
            : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
        )}
      >
        {selectedMarket ? (
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--accent)]">{selectedMarket.symbol}</span>
            <span className="text-[11px] text-[var(--ink-3)] hidden sm:block truncate">{selectedMarket.name}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--ink-3)]">{placeholder}</span>
        )}
        <ChevronDown size={12} className={cn("text-[var(--ink-3)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <Dropdown
        open={open}
        markets={markets}
        selected={selected}
        onToggle={handleToggle}
        multi={false}
        onClose={closeDropdown}
      />
    </div>
  )
}

// ══ MarketMultiSelect — multi-select with chips ══════════════════════════════

interface MarketMultiSelectProps {
  markets: MarketOption[]
  value: string[]
  onChange: (symbols: string[]) => void
  placeholder?: string
  className?: string
}

export function MarketMultiSelect({
  markets,
  value,
  onChange,
  placeholder = "Seleccionar mercados…",
  className,
}: MarketMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = new Set(value)

  const handleToggle = useCallback((symbol: string) => {
    const next = new Set(value)
    if (next.has(symbol)) next.delete(symbol)
    else next.add(symbol)
    onChange(Array.from(next))
  }, [value, onChange])

  const closeDropdown = useCallback(() => setOpen(false), [])

  const removeSymbol = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(s => s !== symbol))
  }

  // Click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center justify-between w-full min-h-9 px-3 py-1.5 rounded-[var(--radius-sm)] border text-left transition-colors gap-2",
          open
            ? "border-[var(--accent)] bg-[var(--panel)]"
            : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-xs text-[var(--ink-3)]">{placeholder}</span>
          ) : (
            value.map(sym => (
              <span key={sym}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {sym}
                <button
                  type="button"
                  onClick={e => removeSymbol(sym, e)}
                  className="hover:opacity-70"
                >
                  <X size={9} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={12} className={cn("text-[var(--ink-3)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <Dropdown
        open={open}
        markets={markets}
        selected={selected}
        onToggle={handleToggle}
        multi={true}
        onClose={closeDropdown}
      />
    </div>
  )
}
