"use client"

import { useEffect, useState } from "react"
import { Star, Plus, X, Loader2, Search, Pencil, Trash2 } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { MarketCategory } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"

type MarketItem = RouterOutputs["markets"]["list"][number]

const CAT_LABELS: Record<MarketCategory, string> = {
  FUTUROS:  "Futuros",
  FX:       "FX / Forex",
  CRIPTO:   "Cripto",
  EQUITIES: "Equities",
}

const CAT_COLOR: Record<MarketCategory, string> = {
  FUTUROS:  "var(--accent)",
  FX:       "var(--win)",
  CRIPTO:   "#f59e0b",
  EQUITIES: "#8b5cf6",
}

const SESSION_COLORS: Record<string, string> = {
  "NY AM":  "var(--accent-soft)",
  "NY PM":  "var(--accent-soft)",
  "London": "var(--win-soft)",
  "Asia":   "var(--be-soft)",
  "24h":    "var(--chip)",
}

const CATS: ("todas" | MarketCategory)[] = ["todas", "FUTUROS", "FX", "CRIPTO", "EQUITIES"]
const SESSIONS_OPTIONS = ["NY AM", "NY PM", "London", "Asia", "24h"]

interface MarketForm {
  symbol:      string
  name:        string
  category:    MarketCategory
  exchange:    string
  tickSize:    string
  pointValue:  string
  currency:    string
  sessions:    string[]
  description: string
}

const FORM_INIT: MarketForm = {
  symbol: "", name: "", category: "FUTUROS", exchange: "", tickSize: "",
  pointValue: "", currency: "USD", sessions: [], description: "",
}

function SessionChip({ s }: { s: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
      background: SESSION_COLORS[s] ?? "var(--chip)",
      color: "var(--ink-2)",
    }}>{s}</span>
  )
}

function MarketCard({ market, onToggleWatch, onEdit, onDelete, toggling }: {
  market: MarketItem
  onToggleWatch: () => void
  onEdit: () => void
  onDelete: () => void
  toggling: boolean
}) {
  const cat   = market.category as MarketCategory
  const color = CAT_COLOR[cat] ?? "var(--accent)"

  return (
    <div
      className="rounded-[var(--radius)] flex flex-col gap-3 p-4 transition-[border-color] duration-150"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"}
    >
      {/* Top color bar */}
      <div className="h-[3px] rounded-full -mt-4 -mx-4 mb-1" style={{ background: color }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center font-mono text-[11px] font-bold shrink-0"
            style={{ background: `${color}18`, color }}
          >
            {market.symbol.slice(0, 3)}
          </div>
          <div>
            <p className="font-mono text-[14px] font-bold leading-tight" style={{ color: "var(--ink)" }}>{market.symbol}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>{market.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-[var(--radius-xs)] transition-colors hover:bg-[var(--chip)]"
            style={{ color: "var(--ink-3)" }}
            aria-label="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-[var(--radius-xs)] transition-colors hover:bg-[var(--loss-soft)]"
            style={{ color: "var(--ink-3)" }}
            aria-label="Eliminar"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={onToggleWatch}
            disabled={toggling}
            className="p-1.5 rounded-[var(--radius-xs)] transition-colors hover:bg-[var(--be-soft)]"
            style={{ color: market.isWatchlisted ? "#f59e0b" : "var(--line-2)" }}
            aria-label={market.isWatchlisted ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            {toggling
              ? <Loader2 size={14} className="animate-spin" />
              : <Star size={14} fill={market.isWatchlisted ? "#f59e0b" : "none"} />}
          </button>
        </div>
      </div>

      {market.description && (
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>{market.description}</p>
      )}

      {/* Specs */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-1 border-t border-[var(--line)]">
        {[
          { l: "Exchange",    v: market.exchange   || "—" },
          { l: "Tick size",   v: market.tickSize   || "—" },
          { l: "Point value", v: market.pointValue || "—" },
          { l: "Divisa",      v: market.currency },
        ].map(f => (
          <div key={f.l}>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--ink-3)" }}>{f.l}</p>
            <p className="font-mono text-[12px] font-semibold mt-0.5" style={{ color: "var(--ink)" }}>{f.v}</p>
          </div>
        ))}
      </div>

      {market.sessions?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {market.sessions.map((s: string) => <SessionChip key={s} s={s} />)}
        </div>
      )}
    </div>
  )
}

/* ── Market Form Modal ── */
function MarketModal({ open, onOpenChange, initial, onSave, saving }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: MarketForm & { id?: string }
  onSave: (form: MarketForm & { id?: string }) => void
  saving: boolean
}) {
  const [form, setForm] = useState<MarketForm>(initial ?? FORM_INIT)
  useEffect(() => { setForm(initial ?? FORM_INIT) }, [open, initial])

  const set = <K extends keyof MarketForm>(k: K, v: MarketForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggleSession = (s: string) => set("sessions", form.sessions.includes(s)
    ? form.sessions.filter(x => x !== s)
    : [...form.sessions, s])

  const valid = form.symbol.trim() && form.name.trim()

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setForm(FORM_INIT) }}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--ink)]">
            {initial?.id ? "Editar instrumento" : "Nuevo instrumento"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Category */}
          <div>
            <p className="text-[11px] text-[var(--ink-3)] mb-1.5">Categoría</p>
            <div className="flex gap-2 flex-wrap">
              {(["FUTUROS", "FX", "CRIPTO", "EQUITIES"] as MarketCategory[]).map(c => (
                <button key={c} onClick={() => set("category", c)}
                  className={cn("px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium border transition-colors",
                    form.category === c
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-2)]")}>
                  {CAT_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Símbolo *</p>
              <Input value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} placeholder="NQ" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Nombre *</p>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nasdaq-100 E-mini" />
            </div>
          </div>

          {/* Exchange + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Exchange</p>
              <Input value={form.exchange} onChange={e => set("exchange", e.target.value)} placeholder="CME" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Divisa</p>
              <Input value={form.currency} onChange={e => set("currency", e.target.value)} placeholder="USD" />
            </div>
          </div>

          {/* Tick size + Point value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Tick size</p>
              <Input value={form.tickSize} onChange={e => set("tickSize", e.target.value)} placeholder="0.25" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--ink-3)] mb-1">Point value</p>
              <Input value={form.pointValue} onChange={e => set("pointValue", e.target.value)} placeholder="$20" />
            </div>
          </div>

          {/* Sessions */}
          <div>
            <p className="text-[11px] text-[var(--ink-3)] mb-1.5">Sesiones</p>
            <div className="flex gap-2 flex-wrap">
              {SESSIONS_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleSession(s)}
                  className={cn("px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border transition-colors",
                    form.sessions.includes(s)
                      ? "border-[var(--accent)] bg-[rgba(79,110,247,0.12)] text-[var(--accent)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-3)]")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] text-[var(--ink-3)] mb-1">Descripción</p>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Notas sobre este instrumento…"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] text-[13px] p-3 resize-none h-20 focus:outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => onSave({ ...form, id: initial?.id })}>
            {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
            {initial?.id ? "Guardar cambios" : "Agregar instrumento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ── */
export default function MercadosPage() {
  const [cat, setCat]           = useState<"todas" | MarketCategory>("todas")
  const [onlyWatch, setOnlyWatch] = useState(false)
  const [search, setSearch]     = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<(MarketForm & { id: string }) | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: markets = [], isLoading } = trpc.markets.list.useQuery()
  const utils = trpc.useUtils()
  const invalidate = () => utils.markets.list.invalidate()

  const seedDefaults = trpc.markets.seedDefaults.useMutation({ onSuccess: invalidate, onError: (err) => toast.error(formatErrorForUser(err)) })
  const createMarket = trpc.markets.create.useMutation({ onSuccess: () => { invalidate(); setModalOpen(false) }, onError: (err) => toast.error(formatErrorForUser(err)) })
  const updateMarket = trpc.markets.update.useMutation({ onSuccess: () => { invalidate(); setEditing(null) }, onError: (err) => toast.error(formatErrorForUser(err)) })
  const toggleWatch  = trpc.markets.toggleWatch.useMutation({
    onSuccess: () => { invalidate(); setTogglingId(null) },
    onError:   (err) => { setTogglingId(null); toast.error(formatErrorForUser(err)) },
  })
  const deleteMarket = trpc.markets.delete.useMutation({ onSuccess: invalidate, onError: (err) => toast.error(formatErrorForUser(err)) })

  // Auto-seed on first load if empty
  useEffect(() => {
    if (!isLoading && markets.length === 0) {
      seedDefaults.mutate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, markets.length])

  const visible = markets
    .filter(m => cat === "todas" || m.category === cat)
    .filter(m => !onlyWatch || m.isWatchlisted)
    .filter(m => !search || m.symbol.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase()))

  const watchCount = markets.filter(m => m.isWatchlisted).length

  function handleSave(form: MarketForm & { id?: string }) {
    if (form.id) {
      updateMarket.mutate({ id: form.id, ...form })
    } else {
      createMarket.mutate(form)
    }
  }

  return (
    <div className="main-content">
      <TopBar
        title="Mercados"
        subtitle={`${markets.length} instrumentos · ${watchCount} en watchlist`}
        actions={[{ label: "Nuevo instrumento", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
            style={{
              paddingLeft: 30, paddingRight: 12, height: 32, borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)", background: "var(--chip)", color: "var(--ink)",
              fontSize: 12.5, outline: "none", width: 140,
            }} />
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)",
              background: cat === c ? "var(--ink)" : "var(--chip)",
              color: cat === c ? "var(--bg)" : "var(--ink-2)",
              fontSize: 12.5, fontWeight: cat === c ? 600 : 400,
              border: "1px solid var(--line)", cursor: "pointer",
            }}>
              {c === "todas" ? "Todos" : CAT_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Watchlist toggle */}
        <button onClick={() => setOnlyWatch(v => !v)} style={{
          height: 32, padding: "0 12px", borderRadius: "var(--radius-sm)",
          background: onlyWatch ? "#f59e0b22" : "var(--chip)",
          color: onlyWatch ? "#f59e0b" : "var(--ink-3)",
          border: `1px solid ${onlyWatch ? "#f59e0b" : "var(--line)"}`,
          fontSize: 12.5, fontWeight: onlyWatch ? 600 : 400,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        }}>
          <Star size={12} fill={onlyWatch ? "#f59e0b" : "none"} /> Watchlist
        </button>
      </div>

      {/* Loading */}
      {(isLoading || seedDefaults.isPending) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "var(--ink-3)" }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontSize: 13 }}>Cargando mercados…</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !seedDefaults.isPending && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--ink-3)", fontSize: 13 }}>
          {onlyWatch ? "Sin instrumentos en watchlist. Haz clic en ★ para agregar." : "Sin resultados."}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !seedDefaults.isPending && visible.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {visible.map(m => (
            <MarketCard
              key={m.id}
              market={m}
              toggling={togglingId === m.id}
              onToggleWatch={() => {
                setTogglingId(m.id)
                toggleWatch.mutate({ id: m.id, isWatchlisted: !m.isWatchlisted })
              }}
              onEdit={() => setEditing({
                id: m.id, symbol: m.symbol, name: m.name,
                category: m.category as MarketCategory,
                exchange: m.exchange, tickSize: m.tickSize,
                pointValue: m.pointValue, currency: m.currency,
                sessions: m.sessions, description: m.description,
              })}
              onDelete={() => deleteMarket.mutate(m.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <MarketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        saving={createMarket.isPending}
      />
      {editing && (
        <MarketModal
          open={!!editing}
          onOpenChange={v => { if (!v) setEditing(null) }}
          initial={editing}
          onSave={handleSave}
          saving={updateMarket.isPending}
        />
      )}
    </div>
  )
}
