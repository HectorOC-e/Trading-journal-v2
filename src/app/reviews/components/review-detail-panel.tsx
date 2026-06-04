"use client"

import { useEffect, useState } from "react"
import { X, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB = RouterOutputs["weeklyReviews"]["list"][number]
type TradeFromDB  = RouterOutputs["trades"]["list"]["items"][number]

function disciplineColor(score: number): string {
  if (score >= 80) return "var(--win)"
  if (score >= 60) return "var(--be)"
  return "var(--loss)"
}

function pnlColor(pnl: number): string {
  return pnl >= 0 ? "var(--win)" : "var(--loss)"
}

function formatPnl(pnl: number): string {
  return pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${Math.abs(pnl).toLocaleString()}`
}

function SectionBlock({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  const items = text.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean)
  const isBullets = text.includes("•") || text.includes("\n")

  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
        {emoji} {title}
      </p>
      {isBullets ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
              <span className="mt-1 text-[10px]" style={{ color: "var(--accent)" }}>▸</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {text || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>Sin contenido</span>}
        </p>
      )}
    </div>
  )
}

export function ReviewDetailPanel({
  review, onClose, accountName, weekTrades, onEdit,
}: {
  review:      ReviewFromDB
  onClose:     () => void
  accountName: (id: string | null) => string
  weekTrades:  TradeFromDB[]
  onEdit?:     (review: ReviewFromDB) => void
}) {
  const isDraft = review.status === "draft"
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const utils = trpc.useUtils()

  const deleteMutation = trpc.weeklyReviews.delete.useMutation({
    onSuccess: () => {
      utils.weeklyReviews.list.invalidate()
      onClose()
      toast.success("Review eliminada correctamente")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  // Escape key to close on desktop
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div
      className="flex flex-col overflow-hidden detail-panel-mobile"
      style={{ width: 380, background: "var(--panel)", borderLeft: "1px solid var(--line)", position: "sticky", top: 0, maxHeight: "100vh" }}
    >
      <button
        onClick={onClose}
        className="flex md:hidden items-center gap-1 text-xs px-5 pt-3 -mb-1 transition-colors"
        style={{ color: "var(--ink-3)" }}
      >
        <ArrowLeft size={13} /> Volver
      </button>
      <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <p className="font-mono font-bold text-2xl" style={{ color: "var(--ink)" }}>{review.weekLabel}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {review.weekRange} · {accountName(review.accountId)}
          </p>
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
            style={{ background: isDraft ? "var(--be-soft)" : "var(--win-soft)", color: isDraft ? "var(--be)" : "var(--win)" }}
          >
            {isDraft ? "Borrador" : "Enviada"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(review)}
              title="Editar review"
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--panel-2)]"
              style={{ color: "var(--ink-3)" }}
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            title="Eliminar review"
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--loss-soft)]"
            style={{ color: "var(--ink-3)" }}
          >
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--ink-3)" }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar review</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            ¿Estás seguro de que quieres eliminar la review de <strong>{review.weekLabel}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
            <button
              onClick={() => deleteMutation.mutate(review.id)}
              disabled={deleteMutation.isPending}
              style={{
                height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
                background: "var(--loss)", color: "white",
                fontSize: 13, fontWeight: 600, border: "none",
                cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                opacity: deleteMutation.isPending ? 0.7 : 1,
              }}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-4 gap-0" style={{ borderBottom: "1px solid var(--line)" }}>
        {[
          { label: "Trades",    value: review.tradeCount.toString(),    color: "var(--ink)" },
          { label: "Net P&L",   value: review.tradeCount > 0 ? formatPnl(review.netPnl) : "—", color: pnlColor(review.netPnl) },
          { label: "Win Rate",  value: review.tradeCount > 0 ? `${review.winRate.toFixed(0)}%` : "—", color: review.winRate >= 55 ? "var(--win)" : "var(--loss)" },
          { label: "Disciplina", value: review.tradeCount > 0 ? `${review.disciplineScore}` : "—", color: disciplineColor(review.disciplineScore) },
        ].map(({ label, value, color }, i) => (
          <div key={label} className="flex flex-col items-center py-3" style={{ borderRight: i < 3 ? "1px solid var(--line)" : undefined }}>
            <span className="font-mono font-bold text-sm" style={{ color }}>{value}</span>
            <span className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <SectionBlock emoji="📋" title="Resumen ejecutivo" text={review.executiveSummary} />

        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>✅ Qué funcionó bien</p>
          <div className="rounded-lg p-3" style={{ background: "var(--win-soft)" }}>
            {review.whatWorked.split("\n").map((l: string) => l.replace(/^•\s*/, "").trim()).filter(Boolean).map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--win)" }}>•</span>
                <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>🔧 A mejorar</p>
          <div className="rounded-lg p-3" style={{ background: "var(--loss-soft)" }}>
            {review.toImprove.split("\n").map((l: string) => l.replace(/^•\s*/, "").trim()).filter(Boolean).map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--loss)" }}>•</span>
                <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>📊 Trades de la semana</p>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  {["Símbolo", "Sesión", "R múlt.", "P&L"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekTrades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center italic" style={{ color: "var(--ink-3)" }}>Sin trades registrados para esta semana</td>
                  </tr>
                ) : (
                  weekTrades.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: i < weekTrades.length - 1 ? "1px solid var(--line)" : undefined }}>
                      <td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--ink)" }}>{t.symbol}</td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: "var(--ink-3)" }}>{t.session}</td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: (t.rMultiple ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}>
                        {t.rMultiple != null ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(1)}R` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: (t.pnl ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}>
                        {t.pnl != null ? formatPnl(t.pnl) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* "Última edición" timestamp — shown only when review was edited after creation */}
        {review.updatedAt !== review.createdAt && !isDraft && (
          <div
            className="px-5 py-2 text-[10px] border-t"
            style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
          >
            Última edición: {formatRelativeTime(review.updatedAt)}
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return "hace un momento"
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} día${diffD > 1 ? "s" : ""}`
}
