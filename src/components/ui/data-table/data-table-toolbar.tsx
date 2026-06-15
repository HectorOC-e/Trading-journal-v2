"use client"

import { type ReactNode } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Search, SlidersHorizontal, Download, X, Rows3, Rows2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { exportTableToCsv } from "./export-csv"
import type { Density } from "./use-data-table"
import type { Table } from "@tanstack/react-table"

export function DataTableToolbar<TData>({
  table,
  density,
  onDensityChange,
  children,
  searchPlaceholder = "Buscar…",
  exportFilename = "export.csv",
  enableColumnToggle = true,
  enableDensity = true,
  enableExport = true,
  trailing,
}: {
  table: Table<TData>
  density: Density
  onDensityChange: (d: Density) => void
  /** Faceted filters, composed by the caller. */
  children?: ReactNode
  searchPlaceholder?: string
  exportFilename?: string
  enableColumnToggle?: boolean
  enableDensity?: boolean
  enableExport?: boolean
  /** Extra controls on the right (e.g. a "New" button). */
  trailing?: ReactNode
}) {
  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter
  const hideableCols = table.getAllLeafColumns().filter(c => c.getCanHide() && c.id !== "select" && c.id !== "actions")

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" />
        <input
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={e => table.setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 w-[180px] pl-8 pr-3 rounded-full text-[12.5px] bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Faceted filters */}
      {children}

      {/* Clear-all */}
      {isFiltered && (
        <button
          onClick={() => { table.resetColumnFilters(); table.setGlobalFilter("") }}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-[0.97]"
        >
          <X size={13} /> Limpiar
        </button>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-1 ml-auto">
        {trailing}

        {enableDensity && (
          <button
            onClick={() => onDensityChange(density === "compact" ? "comfortable" : "compact")}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-95"
            title={density === "compact" ? "Filas cómodas" : "Filas compactas"}
            aria-label="Cambiar densidad"
          >
            {density === "compact" ? <Rows3 size={15} /> : <Rows2 size={15} />}
          </button>
        )}

        {enableColumnToggle && hideableCols.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-95"
                title="Columnas"
                aria-label="Mostrar/ocultar columnas"
              >
                <SlidersHorizontal size={15} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[60] min-w-[180px] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-md)] p-1 scale-pop"
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-3)]">Columnas</DropdownMenu.Label>
                {hideableCols.map(col => (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    onSelect={e => e.preventDefault()}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-xs)] text-[13px] text-[var(--ink)] cursor-pointer hover:bg-[var(--panel-2)] outline-none"
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0",
                      col.getIsVisible() ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--line-2)]",
                    )}>
                      {col.getIsVisible() && <Check size={11} />}
                    </span>
                    {col.columnDef.meta?.headerLabel ?? col.id}
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        {enableExport && (
          <button
            onClick={() => exportTableToCsv(table, exportFilename)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-95"
            title="Exportar CSV"
            aria-label="Exportar CSV"
          >
            <Download size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Selection action bar — render when rows are selected. */
export function BulkActionsBar<TData>({
  table,
  children,
}: {
  table: Table<TData>
  /** Action buttons; receive the selected original rows. */
  children?: (selected: TData[]) => ReactNode
}) {
  const selectedRows = table.getSelectedRowModel().rows
  const count = selectedRows.length
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-soft)] scale-pop">
      <span className="text-[12.5px] font-semibold text-[var(--accent)]">{count} seleccionada{count === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-1.5">
        {children?.(selectedRows.map(r => r.original))}
      </div>
      <button
        onClick={() => table.resetRowSelection()}
        className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
      >
        <X size={13} /> Deseleccionar
      </button>
    </div>
  )
}
