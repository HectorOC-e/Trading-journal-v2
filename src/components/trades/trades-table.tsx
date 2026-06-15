// TradesTable — standardized on the shared <DataTable> (TanStack Table headless).
// Sortable columns, faceted Linear-style filters, pagination, column visibility,
// density, CSV export, row selection + bulk actions, and animated rows.

"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  BulkActionsBar,
  FacetedFilter,
  useDataTable,
  multiSelectFilter,
} from "@/components/ui/data-table"
import { exportTableToCsv } from "@/components/ui/data-table/export-csv"
import { cn } from "@/lib/utils"
import type { Trade, Account, Setup, TradeTag } from "@/types"

// ── Visual config (ported from the old TradeRow) ─────────────────────────────
const SESSION_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "New York":     { label: "NY",      color: "#4f6ef7", bg: "rgba(79,110,247,0.10)" },
  "London":       { label: "London",  color: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
  "Asia":         { label: "Asia",    color: "#d97706", bg: "rgba(217,119,6,0.10)"  },
  "London Close": { label: "LDN Cl",  color: "#9333ea", bg: "rgba(147,51,234,0.09)" },
}
const TAG_CFG: Record<string, { color: string; bg: string }> = {
  "A+":        { color: "#16a34a",       bg: "rgba(22,163,74,0.10)" },
  "A":         { color: "var(--accent)", bg: "var(--accent-soft)"   },
  "Plan":      { color: "var(--accent)", bg: "var(--accent-soft)"   },
  "Off-plan":  { color: "var(--loss)",   bg: "var(--loss-soft)"     },
  "Impulsivo": { color: "var(--loss)",   bg: "var(--loss-soft)"     },
  "BE":        { color: "var(--be)",     bg: "var(--be-soft)"       },
}
const RESULT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  WIN:  { label: "W",    color: "var(--win)",    bg: "var(--win-soft)"    },
  LOSS: { label: "L",    color: "var(--loss)",   bg: "var(--loss-soft)"   },
  BE:   { label: "BE",   color: "var(--be)",     bg: "var(--be-soft)"     },
  OPEN: { label: "OPEN", color: "var(--accent)", bg: "var(--accent-soft)" },
}
const RESULT_LABELS: Record<string, string> = { WIN: "Win", LOSS: "Loss", BE: "BE", OPEN: "Abierto" }
const QUALITY_TAGS: TradeTag[] = ["A+", "A", "Plan", "Off-plan", "Impulsivo", "BE"] as TradeTag[]

function getResult(t: Trade): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (t.status !== "CLOSED" && t.pnl == null) return "OPEN"
  const pnl = t.pnl ?? 0
  return pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BE"
}
function qualityOf(t: Trade): string {
  return (t.tags.find(tag => QUALITY_TAGS.includes(tag as TradeTag)) as string) ?? ""
}
function shortAccount(name: string) {
  const parts = name.split(" ")
  return parts.length <= 2 ? name : parts.slice(0, 2).join(" ")
}
function fmtPnl(pnl: number): string {
  return `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface TradesTableProps {
  trades:     Trade[]
  accounts?:  Account[]
  setups?:    Setup[]
  selectedId?: string
  onSelect?:  (trade: Trade | null) => void
  className?: string
}

export function TradesTable({ trades, accounts = [], setups = [], selectedId, onSelect, className }: TradesTableProps) {
  const accountName = useMemo(() => {
    const m = new Map(accounts.map(a => [a.id, a.name]))
    return (id: string) => m.get(id) ?? "—"
  }, [accounts])
  const setupById = useMemo(() => new Map(setups.map(s => [s.id, s])), [setups])

  const columns = useMemo<ColumnDef<Trade>[]>(() => [
    {
      id: "select",
      meta: { width: "36px" },
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onChange={(v) => table.toggleAllPageRowsSelected(v)}
          ariaLabel="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()} className="flex items-center">
          <Checkbox checked={row.getIsSelected()} onChange={(v) => row.toggleSelected(v)} ariaLabel="Seleccionar fila" />
        </div>
      ),
    },
    {
      id: "result",
      accessorFn: getResult,
      filterFn: multiSelectFilter,
      meta: { width: "84px", headerLabel: "Dir / Res", facet: { label: "Resultado" } },
      header: () => <span>Dir / Res</span>,
      cell: ({ row }) => {
        const t = row.original
        const rc = RESULT_CFG[getResult(t)]
        const isOpen = getResult(t) === "OPEN"
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center justify-center w-[38px] h-[18px] rounded-[4px] text-[9px] font-bold tracking-wider"
              style={{ background: t.direction === "LONG" ? "var(--win-soft)" : "var(--loss-soft)", color: t.direction === "LONG" ? "var(--win)" : "var(--loss)" }}>
              {t.direction}
            </span>
            <span className="inline-flex items-center justify-center w-[38px] h-[18px] rounded-[4px] text-[9px] font-bold tracking-wider"
              style={{ background: rc.bg, color: rc.color, border: isOpen ? `1px solid ${rc.color}40` : "none" }}>
              {rc.label}
            </span>
          </div>
        )
      },
    },
    {
      id: "symbol",
      accessorKey: "symbol",
      meta: { width: "minmax(120px, 1.4fr)", headerLabel: "Símbolo" },
      header: () => <span>Símbolo</span>,
      cell: ({ row }) => {
        const t = row.original
        const setup = t.setupId ? setupById.get(t.setupId) : undefined
        return (
          <div className="min-w-0">
            <p className="font-mono text-[14px] font-bold leading-none tracking-tight text-[var(--ink)]">{t.symbol}</p>
            {setup && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] font-bold px-1.5 py-px rounded-[3px] tracking-wider" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{setup.abbreviation}</span>
                <span className="text-[11px] text-[var(--ink-3)] truncate max-w-[80px]">{setup.name}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "account",
      accessorFn: (t) => accountName(t.accountId),
      filterFn: multiSelectFilter,
      meta: { width: "minmax(90px, 1fr)", headerLabel: "Cuenta", facet: { label: "Cuenta" } },
      header: () => <span>Cuenta</span>,
      cell: ({ getValue }) => <span className="text-[12px] text-[var(--ink-2)] truncate block">{shortAccount(String(getValue()))}</span>,
    },
    {
      id: "date",
      accessorKey: "date",
      meta: { width: "minmax(90px, 1fr)", headerLabel: "Fecha" },
      header: () => <span>Fecha</span>,
      cell: ({ row }) => {
        const t = row.original
        return (
          <div>
            <p className="text-[12px] text-[var(--ink-2)] whitespace-nowrap">{t.date}</p>
            {t.openTime && <p className="font-mono text-[10px] text-[var(--ink-3)] mt-0.5">{t.openTime}</p>}
          </div>
        )
      },
    },
    {
      id: "session",
      accessorKey: "session",
      filterFn: multiSelectFilter,
      meta: { width: "minmax(80px, 0.9fr)", headerLabel: "Sesión", facet: { label: "Sesión" } },
      header: () => <span>Sesión</span>,
      cell: ({ getValue }) => {
        const s = String(getValue())
        const cfg = SESSION_CFG[s]
        return <span className="inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: cfg?.bg ?? "var(--chip)", color: cfg?.color ?? "var(--ink-3)" }}>{cfg?.label ?? s}</span>
      },
    },
    {
      id: "rMultiple",
      accessorFn: (t) => t.rMultiple ?? undefined,
      sortUndefined: "last",
      meta: { width: "72px", headerLabel: "R", align: "right" },
      header: () => <span>R</span>,
      cell: ({ row }) => {
        const t = row.original
        const r = t.rMultiple ?? null
        const rc = RESULT_CFG[getResult(t)]
        if (getResult(t) === "OPEN") {
          return <span className="font-mono text-[11px] text-[var(--ink-3)]">{r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}</span>
        }
        return <span className="inline-flex items-center justify-center min-w-[46px] px-2 py-[3px] rounded-[5px] font-mono text-[12px] font-bold" style={{ background: rc.bg, color: rc.color }}>{r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}</span>
      },
    },
    {
      id: "pnl",
      accessorFn: (t) => t.pnl ?? undefined,
      sortUndefined: "last",
      meta: { width: "minmax(80px, 0.9fr)", headerLabel: "P&L", align: "right", csvLabel: "PnL" },
      header: () => <span>P&L</span>,
      cell: ({ row }) => {
        const t = row.original
        const rc = RESULT_CFG[getResult(t)]
        return t.pnl != null
          ? <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: rc.color }}>{fmtPnl(t.pnl)}</span>
          : <span className="text-[11px] text-[var(--ink-3)]">open</span>
      },
    },
    {
      id: "quality",
      accessorFn: qualityOf,
      filterFn: multiSelectFilter,
      meta: { width: "minmax(80px, 0.9fr)", headerLabel: "Calidad", facet: { label: "Calidad" } },
      header: () => <span>Calidad</span>,
      cell: ({ getValue }) => {
        const q = String(getValue())
        const cfg = q ? TAG_CFG[q] : null
        return cfg
          ? <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>{q}</span>
          : <span className="text-[var(--ink-3)] text-[11px]">—</span>
      },
    },
    // Filter-only (hidden) — drives the "Dirección" facet without its own column.
    {
      id: "direction",
      accessorKey: "direction",
      filterFn: multiSelectFilter,
      enableHiding: false,
      meta: { facet: { label: "Dirección" } },
      header: () => null,
      cell: () => null,
    },
  ], [accountName, setupById])

  const { table, density, setDensity } = useDataTable<Trade>({
    data: trades,
    columns,
    storageKey: "tj-trades-table",
    pageSize: 25,
    enableRowSelection: true,
    getRowId: (t) => t.id,
    initialSorting: [{ id: "date", desc: true }],
    initialColumnVisibility: { direction: false }, // filter-only helper column
  })

  // Summary from the current filtered set.
  const filtered = table.getFilteredRowModel().rows.map(r => r.original)
  const netPnl = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins   = filtered.filter(t => (t.rMultiple ?? 0) > 0).length
  const wr     = filtered.length ? Math.round((wins / filtered.length) * 100) : 0
  const avgR   = filtered.length ? filtered.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / filtered.length : 0
  const pnlColor = netPnl >= 0 ? "var(--win)" : "var(--loss)"

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[14px] font-bold text-[var(--ink)]">{filtered.length} trades</span>
          <span className="font-mono text-[13px] font-bold" style={{ color: pnlColor }}>{netPnl >= 0 ? "+" : "-"}${Math.abs(netPnl).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[.07em] text-[var(--ink-3)]">WR</p>
            <p className="font-mono text-[12.5px] font-bold" style={{ color: wr >= 50 ? "var(--win)" : "var(--loss)" }}>{wr}%</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[.07em] text-[var(--ink-3)]">Avg R</p>
            <p className="font-mono text-[12.5px] font-bold" style={{ color: avgR >= 0 ? "var(--win)" : "var(--loss)" }}>{avgR >= 0 ? "+" : ""}{avgR.toFixed(1)}R</p>
          </div>
        </div>
      </div>

      {/* Toolbar + faceted filters */}
      <DataTableToolbar
        table={table}
        density={density}
        onDensityChange={setDensity}
        searchPlaceholder="Buscar símbolo…"
        exportFilename="trades.csv"
      >
        <FacetedFilter column={table.getColumn("result")}    title="Resultado" order={["WIN", "LOSS", "BE", "OPEN"]} format={v => RESULT_LABELS[v] ?? v} />
        <FacetedFilter column={table.getColumn("quality")}   title="Calidad" />
        <FacetedFilter column={table.getColumn("direction")} title="Dirección" />
        <FacetedFilter column={table.getColumn("account")}   title="Cuenta" />
        <FacetedFilter column={table.getColumn("session")}   title="Sesión" />
      </DataTableToolbar>

      <BulkActionsBar table={table}>
        {() => (
          <button
            onClick={() => exportTableToCsv(table, "trades-seleccion.csv")}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium bg-[var(--panel)] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors active:scale-[0.97]"
          >
            Exportar CSV
          </button>
        )}
      </BulkActionsBar>

      <DataTable
        table={table}
        density={density}
        onRowClick={(t) => onSelect?.(t.id === selectedId ? null : t)}
        empty={<EmptyTrades />}
      />

      <DataTablePagination table={table} />
    </div>
  )
}

// ── Small checkbox ────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, ariaLabel }: { checked: boolean | "indeterminate"; onChange: (v: boolean) => void; ariaLabel: string }) {
  const on = checked === true
  return (
    <button
      role="checkbox"
      aria-checked={checked === "indeterminate" ? "mixed" : on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className={cn(
        "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors active:scale-90",
        on || checked === "indeterminate" ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--line-2)] hover:border-[var(--ink-3)]",
      )}
    >
      {on && <CheckIcon />}
      {checked === "indeterminate" && <span className="w-2 h-[2px] bg-white rounded" />}
    </button>
  )
}
function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EmptyTrades() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-[13px] font-medium text-[var(--ink-2)]">Sin trades con estos filtros</p>
      <p className="text-[12px] text-[var(--ink-3)]">Ajusta o limpia los filtros para ver más.</p>
    </div>
  )
}
