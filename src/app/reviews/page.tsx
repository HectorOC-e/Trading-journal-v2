"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockReviews } from "@/mock-data"

const KPIS = [
  { label: "Trades",     value: "23",      sub: "esta semana",  trend: "neutral" as const, mono: true },
  { label: "Net P&L",    value: "+$2,640", sub: "esta semana",  trend: "up"      as const, mono: true },
  { label: "Win Rate",   value: "65%",     sub: "esta semana",  trend: "up"      as const, mono: true },
  { label: "Discipline", value: "78",      sub: "score",        trend: "neutral" as const, mono: true },
]

function NuevaReviewModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader><DialogTitle>Nueva review semanal</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Cuenta</label>
              <select className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
                <option>FXify 100K · Phase 2</option>
              </select>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Semana</label>
              <select className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
                <option>Sem. 20 · 14–20 may 2026</option>
              </select>
            </div>
          </div>

          {/* Auto summary */}
          <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
            <p className="text-eyebrow mb-2">Resumen Automático</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[["Trades","23",""],["Net P&L","+$2,640","text-[var(--win)]"],["Win rate","65%",""],["Discipline","78",""]].map(([l,v,c]) => (
                <div key={l}>
                  <p className={cn("font-mono font-bold text-base", c || "text-[var(--ink)]")}>{v}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-eyebrow block mb-1.5">Resumen ejecutivo</label>
            <Textarea placeholder="Describe los puntos clave de la semana..." />
          </div>
          <div>
            <label className="text-eyebrow block mb-1.5">¿Qué funcionó bien?</label>
            <Textarea placeholder="3–5 puntos clave" />
          </div>
          <div>
            <label className="text-eyebrow block mb-1.5">A mejorar próxima semana</label>
            <Textarea placeholder="3–5 puntos de mejora" />
          </div>

          {/* Aprendizajes pendientes */}
          <div className="rounded-[var(--radius-sm)] p-3 border-l-4 border-[var(--accent)]" style={{ background: "rgba(79,110,247,0.08)" }}>
            <p className="text-xs font-semibold text-[var(--accent)] mb-2">📚 3 entradas marcadas para revisar:</p>
            <ul className="text-xs text-[var(--ink-2)] space-y-1">
              <li>· &apos;Volume Profile&apos; — libro de Aitor (cap 4–6)</li>
              <li>· Video MotiweStudios — Liquidity Grab</li>
              <li>· Notas sobre tilt management (post-loss)</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Guardar borrador</Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>Enviar review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReviewsPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div>
        <TopBar title="Reviews" subtitle="Sem. 20 · 14–20 may 2026"
          actions={[{ label: "Nueva review", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />
        <KpiStrip items={KPIS} className="mb-6" />

        <div className="flex flex-col gap-3">
          {mockReviews.map(r => (
            <div key={r.id} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{r.weekLabel} · {r.weekRange}</p>
                  <p className="text-xs text-[var(--ink-3)] mt-0.5">FXify 100K · Phase 2</p>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  r.status === "draft" ? "bg-[var(--be-soft)] text-[var(--be)]" : "bg-[var(--win-soft)] text-[var(--win)]"
                )}>
                  {r.status === "draft" ? "Borrador" : "Enviada"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-3 p-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                {[["Trades", r.tradeCount.toString(), ""], ["Net P&L", `+$${r.netPnl.toLocaleString()}`, "text-[var(--win)]"], ["Win Rate", `${r.winRate}%`, ""], ["Discipline", r.disciplineScore.toString(), ""]].map(([l,v,c]) => (
                  <div key={l} className="text-center">
                    <p className={cn("font-mono font-bold", c || "text-[var(--ink)]")}>{v}</p>
                    <p className="text-[10px] text-[var(--ink-3)]">{l}</p>
                  </div>
                ))}
              </div>
              {r.executiveSummary && (
                <p className="text-sm text-[var(--ink-2)] line-clamp-2 mb-3">{r.executiveSummary}</p>
              )}
              <Button variant="ghost" size="sm">Ver review completa</Button>
            </div>
          ))}
        </div>
      </div>
      <NuevaReviewModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
