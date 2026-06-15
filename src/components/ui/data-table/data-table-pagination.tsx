"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Table } from "@tanstack/react-table"

export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
  const { pageIndex } = table.getState().pagination
  const pageCount = table.getPageCount()
  const total = table.getFilteredRowModel().rows.length
  if (total === 0) return null

  const from = pageIndex * table.getState().pagination.pageSize + 1
  const to = Math.min(from + table.getState().pagination.pageSize - 1, total)

  const btn = "w-7 h-7 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-3)] enabled:hover:bg-[var(--chip)] enabled:hover:text-[var(--ink)] transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"

  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-2.5 text-[12px] text-[var(--ink-3)]">
      <span className="tabular-nums">
        {from}–{to} de <span className="font-semibold text-[var(--ink-2)]">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button className={btn} onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="Primera página"><ChevronsLeft size={15} /></button>
        <button className={btn} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Página anterior"><ChevronLeft size={15} /></button>
        <span className={cn("px-2 tabular-nums")}>{pageIndex + 1} / {Math.max(1, pageCount)}</span>
        <button className={btn} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Página siguiente"><ChevronRight size={15} /></button>
        <button className={btn} onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} aria-label="Última página"><ChevronsRight size={15} /></button>
      </div>
    </div>
  )
}
