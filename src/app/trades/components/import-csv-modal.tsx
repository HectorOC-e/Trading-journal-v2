"use client"

import { useState, useRef } from "react"
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SimpleTable } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { ParsedTrade } from "@/domains/trading/services/csv-import"

// ── Types ──────────────────────────────────────────────────────────────────

interface DryRunResponse {
  format:    string
  toCreate:  ParsedTrade[]
  skipped:   number
  warnings:  string[]
}

interface ImportResponse {
  format:    string
  created:   number
  skipped:   number
  warnings:  string[]
}

type ImportState =
  | { phase: "idle" }
  | { phase: "analyzing" }
  | { phase: "preview"; dryRun: DryRunResponse }
  | { phase: "importing" }
  | { phase: "done"; result: ImportResponse }
  | { phase: "error"; message: string }

// ── Component ──────────────────────────────────────────────────────────────

interface ImportCsvModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportCsvModal({ open, onOpenChange }: ImportCsvModalProps) {
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [state, setState] = useState<ImportState>({ phase: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: accounts = [] } = trpc.accounts.list.useQuery()
  const utils = trpc.useUtils()

  const reset = () => {
    setSelectedFile(null)
    setSelectedAccount("")
    setState({ phase: "idle" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setSelectedFile(f)
    // Reset state when new file is selected
    if (state.phase !== "idle") setState({ phase: "idle" })
  }

  const handleAnalyze = async () => {
    if (!selectedFile || !selectedAccount) return
    setState({ phase: "analyzing" })

    try {
      const fd = new FormData()
      fd.append("file",      selectedFile)
      fd.append("accountId", selectedAccount)
      fd.append("confirm",   "false")

      const res = await fetch("/api/import/mt4", { method: "POST", body: fd })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const data = (await res.json()) as DryRunResponse
      setState({ phase: "preview", dryRun: data })
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleConfirm = async () => {
    if (!selectedFile || !selectedAccount) return
    setState({ phase: "importing" })

    try {
      const fd = new FormData()
      fd.append("file",      selectedFile)
      fd.append("accountId", selectedAccount)
      fd.append("confirm",   "true")

      const res = await fetch("/api/import/mt4", { method: "POST", body: fd })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const data = (await res.json()) as ImportResponse
      setState({ phase: "done", result: data })
      utils.trades.list.invalidate()
      // Imports can add many trades (and even trip an account lock) — refresh the
      // accounts view's stats too, not just the trades list.
      utils.trades.dashboardStats.invalidate()
      utils.accounts.list.invalidate()
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) })
    }
  }

  const isAnalyzing  = state.phase === "analyzing"
  const isImporting  = state.phase === "importing"
  const isBusy       = isAnalyzing || isImporting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[620px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">

          {/* ── Cuenta selector ── */}
          <div>
            <p className="text-eyebrow mb-2">Cuenta *</p>
            {accounts.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">No hay cuentas activas.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setSelectedAccount(acc.id)}
                    className={cn(
                      "flex-1 min-w-[140px] text-left rounded-[var(--radius-sm)] p-2.5 border transition-[color,background-color,border-color,box-shadow,transform,opacity]",
                      selectedAccount === acc.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]",
                      isBusy && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <p className="text-xs font-semibold text-[var(--ink)]">{acc.name}</p>
                    <p className="text-[10px] text-[var(--ink-3)] font-mono">${Number(acc.initialBalance).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── File upload ── */}
          <div>
            <p className="text-eyebrow mb-2">Archivo CSV *</p>
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 h-20 rounded-[var(--radius-sm)] border-2 border-dashed cursor-pointer transition-colors",
              selectedFile
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] hover:border-[var(--ink-3)]",
              isBusy && "opacity-50 cursor-not-allowed"
            )}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                disabled={isBusy}
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--ink)]">{selectedFile.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[var(--ink-3)]">
                  <Upload size={16} />
                  <span className="text-sm">Arrastra un CSV aquí o haz clic para seleccionar</span>
                </div>
              )}
            </label>
          </div>

          {/* ── State: error ── */}
          {state.phase === "error" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--loss-soft)] border border-[var(--loss)]">
              <AlertTriangle size={14} className="text-[var(--loss)] shrink-0 mt-px" />
              <p className="text-xs text-[var(--loss)]">{state.message}</p>
            </div>
          )}

          {/* ── State: preview ── */}
          {state.phase === "preview" && (
            <div className="flex flex-col gap-3">
              {/* Format detected */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                <FileText size={13} className="text-[var(--ink-3)]" />
                <span className="text-xs text-[var(--ink-2)]">
                  Formato detectado: <span className="font-semibold text-[var(--accent)]">{state.dryRun.format.toUpperCase()}</span>
                </span>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--win-soft)] text-center">
                  <p className="text-lg font-bold font-mono text-[var(--win)]">{state.dryRun.toCreate.length}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">A importar</p>
                </div>
                <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--chip)] text-center">
                  <p className="text-lg font-bold font-mono text-[var(--ink-2)]">{state.dryRun.skipped}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">Duplicados</p>
                </div>
                <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--be-soft)] text-center">
                  <p className="text-lg font-bold font-mono text-[var(--be)]">{state.dryRun.warnings.length}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">Advertencias</p>
                </div>
              </div>

              {/* Preview table */}
              {state.dryRun.toCreate.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <SimpleTable
                    data={state.dryRun.toCreate}
                    density="compact"
                    getRowKey={(_t, i) => String(i)}
                    columns={[
                      { key: "ticket", header: "Ticket", render: (t) => <span className="font-mono text-[11px] text-[var(--ink-3)]">{t.ticket}</span> },
                      { key: "symbol", header: "Símbolo", render: (t) => <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">{t.symbol}</span> },
                      { key: "type", header: "Tipo", render: (t) => <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", t.type === "buy" ? "bg-[var(--win-soft)] text-[var(--win)]" : "bg-[var(--loss-soft)] text-[var(--loss)]")}>{t.type.toUpperCase()}</span> },
                      { key: "size", header: "Lotes", align: "right", render: (t) => <span className="font-mono text-[11px]">{t.size}</span> },
                      { key: "openTime", header: "Apertura", render: (t) => <span className="font-mono text-[11px] text-[var(--ink-3)]">{new Date(t.openTime).toLocaleDateString()}</span> },
                      { key: "closeTime", header: "Cierre", render: (t) => <span className="font-mono text-[11px] text-[var(--ink-3)]">{new Date(t.closeTime).toLocaleDateString()}</span> },
                      { key: "profit", header: "P&L", align: "right", render: (t) => <span className={cn("font-mono text-[11px] font-semibold", t.profit >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{t.profit >= 0 ? "+" : ""}${t.profit.toFixed(2)}</span> },
                    ]}
                  />
                </div>
              )}

              {/* Warnings */}
              {state.dryRun.warnings.length > 0 && (
                <div className="rounded-[var(--radius-sm)] border border-[var(--be)] bg-[var(--be-soft)] p-3 max-h-28 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-[var(--be)] mb-1.5">Advertencias:</p>
                  {state.dryRun.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-[var(--be)]">{w}</p>
                  ))}
                </div>
              )}

              {state.dryRun.toCreate.length === 0 && (
                <p className="text-sm text-center text-[var(--ink-3)] py-2">
                  No hay trades nuevos para importar.
                </p>
              )}
            </div>
          )}

          {/* ── State: done ── */}
          {state.phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={40} className="text-[var(--win)]" />
              <div className="text-center">
                <p className="font-semibold text-[var(--ink)]">Importación completada</p>
                <p className="text-sm text-[var(--ink-3)] mt-1">
                  {state.result.created} trades creados · {state.result.skipped} duplicados omitidos
                </p>
              </div>
              {state.result.warnings.length > 0 && (
                <div className="w-full rounded-[var(--radius-sm)] border border-[var(--be)] bg-[var(--be-soft)] p-3 max-h-28 overflow-y-auto">
                  {state.result.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-[var(--be)]">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <DialogFooter>
          {state.phase === "done" ? (
            <Button variant="primary" onClick={handleClose}>Cerrar</Button>
          ) : state.phase === "preview" && state.dryRun.toCreate.length > 0 ? (
            <>
              <Button variant="ghost" onClick={reset} disabled={isBusy}>Reiniciar</Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isBusy}
              >
                {isImporting ? (
                  <><Loader2 size={14} className="animate-spin" /> Importando…</>
                ) : (
                  `Confirmar importación (${state.dryRun.toCreate.length})`
                )}
              </Button>
            </>
          ) : state.phase === "preview" ? (
            <>
              <Button variant="ghost" onClick={reset}>Reiniciar</Button>
              <Button variant="ghost" onClick={handleClose}>Cerrar</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={isBusy}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={!selectedFile || !selectedAccount || isBusy}
              >
                {isAnalyzing ? (
                  <><Loader2 size={14} className="animate-spin" /> Analizando…</>
                ) : (
                  "Analizar"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
