import type { Table } from "@tanstack/react-table"

// Quote a CSV cell only when needed (comma, quote, newline). RFC-4180 escaping.
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export the table's CURRENT view (filtered + sorted, all pages) to a CSV file.
 * Uses each visible leaf column's id as the header and its accessor value per row.
 */
export function exportTableToCsv<TData>(table: Table<TData>, filename = "export.csv"): void {
  const cols = table.getVisibleLeafColumns().filter(c => c.id !== "select" && c.id !== "actions")
  const header = cols.map(c => csvCell((c.columnDef.meta?.csvLabel ?? c.columnDef.meta?.headerLabel ?? c.id)))
  const rows = table.getFilteredRowModel().rows.map(row =>
    cols.map(c => csvCell(row.getValue(c.id))).join(","),
  )
  const csv = [header.join(","), ...rows].join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }) // BOM → Excel UTF-8
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
