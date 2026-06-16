"use client"

import { useEffect, useMemo, useState } from "react"
import { useViewportWidth, isHiddenAt, type Breakpoint } from "@/hooks/useViewportWidth"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

// Per-column UI hints, read by DataTable / toolbar / CSV export.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string                       // grid-template width, e.g. "80px" | "1.5fr"
    align?: "left" | "right" | "center"
    headerLabel?: string                 // plain label for the column-visibility menu
    csvLabel?: string                    // override CSV header
    facet?: { label: string; format?: (v: string) => string }
    hideBelow?: Breakpoint               // auto-hide on viewports narrower than this
  }
}
import type { RowData } from "@tanstack/react-table"

export type Density = "compact" | "comfortable"

/** Faceted multi-select filter: keep rows whose cell value is in the selected set. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const multiSelectFilter: FilterFn<any> = (row, columnId, value: string[]) => {
  if (!value?.length) return true
  return value.includes(String(row.getValue(columnId)))
}
multiSelectFilter.autoRemove = (value) => !Array.isArray(value) || value.length === 0

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  /** Namespace for persisted density + column visibility (localStorage). */
  storageKey?: string
  pageSize?: number
  enableRowSelection?: boolean
  getRowId?: (row: TData, index: number) => string
  initialSorting?: SortingState
  /** Base visibility (e.g. filter-only helper columns hidden). Stored prefs win. */
  initialColumnVisibility?: VisibilityState
}

function loadJSON<T>(key: string | undefined, suffix: string, fallback: T): T {
  if (!key || typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(`${key}:${suffix}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function useDataTable<TData>({
  data,
  columns,
  storageKey,
  pageSize = 25,
  enableRowSelection = false,
  getRowId,
  initialSorting = [],
  initialColumnVisibility = {},
}: UseDataTableOptions<TData>) {
  const [sorting, setSorting]               = useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter]     = useState("")
  const [rowSelection, setRowSelection]     = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => ({ ...initialColumnVisibility, ...loadJSON(storageKey, "cols", {}) }),
  )
  const [density, setDensity] = useState<Density>(
    () => loadJSON<Density>(storageKey, "density", "comfortable"),
  )

  // Responsive overrides: columns with meta.hideBelow are force-hidden on
  // narrow viewports so tables don't overflow horizontally on mobile.
  const width = useViewportWidth()
  const responsiveHidden = useMemo(() => {
    const v: VisibilityState = {}
    for (const c of columns) {
      const id = c.id ?? ("accessorKey" in c ? String(c.accessorKey) : undefined)
      const hb = c.meta?.hideBelow as Breakpoint | undefined
      if (id && hb && isHiddenAt(hb, width)) v[id] = false
    }
    return v
  }, [columns, width])
  const effectiveVisibility = useMemo(
    () => ({ ...columnVisibility, ...responsiveHidden }),
    [columnVisibility, responsiveHidden],
  )

  // Persist density + column visibility.
  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:cols`, JSON.stringify(columnVisibility)) } catch { /* ignore */ }
  }, [storageKey, columnVisibility])
  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:density`, JSON.stringify(density)) } catch { /* ignore */ }
  }, [storageKey, density])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility: effectiveVisibility, rowSelection },
    onSortingChange:          setSorting,
    onColumnFiltersChange:    setColumnFilters,
    onGlobalFilterChange:     setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange:     setRowSelection,
    enableRowSelection,
    getRowId,
    filterFns: { multiSelect: multiSelectFilter },
    globalFilterFn: "includesString",
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel:    getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize } },
  })

  // Snap back to page 0 whenever filters change so the user isn't stranded on an
  // empty page after narrowing the result set.
  const filterSig = useMemo(
    () => JSON.stringify(columnFilters) + globalFilter,
    [columnFilters, globalFilter],
  )
  useEffect(() => {
    table.setPageIndex(0)
    // `table` identity churns every render; depend only on the filter signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSig])

  return { table, density, setDensity }
}
