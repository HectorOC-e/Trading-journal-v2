"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const SETUPS = [
  { abbr: "OR", name: "Opening Range Break", market: "NQ Futures", wr: "64%", avgR: "+1.80", trades: 18, color: "#f59e0b" },
  { abbr: "FA", name: "Failed Auction",       market: "NQ Futures", wr: "52%", avgR: "+8.90", trades: 11, color: "#ef4444" },
  { abbr: "LR", name: "London Reversal",      market: "FX",         wr: "58%", avgR: "+1.40", trades: 8,  color: "#4f6ef7" },
  { abbr: "LG", name: "Liquidity Grab",       market: "NQ Futures", wr: "71%", avgR: "+2.20", trades: 14, color: "#22c55e" },
  { abbr: "TC", name: "Trend Continuation",   market: "Equities",   wr: "49%", avgR: "+0.60", trades: 6,  color: "#9b59b6" },
  { abbr: "AS", name: "Asia Sweep",           market: "NQ Futures", wr: "55%", avgR: "+1.10", trades: 9,  color: "#14b8a6" },
  { abbr: "VW", name: "VWAP Reclaim",         market: "NQ Futures", wr: "60%", avgR: "+1.50", trades: 12, color: "#4f6ef7" },
  { abbr: "NF", name: "News Fade – NFP",      market: "NQ Futures", wr: "41%", avgR: "-0.20", trades: 5,  color: "#6b7280" },
]

const APLUS = ["Confluencia HTF", "Killzone activa", "Volumen sobre promedio", "Stop estructural"]
const STANDARD = ["Setup #1 o #2 del día", "Risk ≤ 1R", "RR ≥ 1.5"]

function NuevoSetupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [direction, setDirection] = useState<"LONG" | "SHORT" | "AMBAS">("AMBAS")
  const [aplus, setAplus] = useState(APLUS)
  const [standard, setStandard] = useState(STANDARD)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px]">
        <DialogHeader><DialogTitle>Nuevo setup</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-eyebrow block mb-1.5">Nombre *</label>
            <Input placeholder="MMXM — Breaker Block" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Abreviatura *</label>
              <Input placeholder="BB" />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Mercado *</label>
              <select className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
                <option>NQ Futures</option><option>ES Futures</option><option>FX</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-eyebrow mb-2">Dirección</p>
            <div className="flex gap-2">
              {(["LONG","SHORT","AMBAS"] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors",
                    direction === d ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-eyebrow block mb-1.5">Descripción *</label>
            <Textarea placeholder="¿Cuándo se ejecuta este setup?" />
          </div>
          {/* A+ checklist */}
          <div className="border-t border-[var(--line)] pt-3">
            <p className="text-eyebrow mb-2">A+ Checklist</p>
            <div className="flex flex-col gap-2">
              {aplus.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-[var(--ink-2)] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
                  {item}
                </label>
              ))}
              <button onClick={() => setAplus([...aplus, ""])}
                className="text-xs text-[var(--ink-3)] border border-dashed border-[var(--line)] rounded-[var(--radius-sm)] py-1.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                + Añadir ítem
              </button>
            </div>
          </div>
          {/* Standard checklist */}
          <div className="border-t border-[var(--line)] pt-3">
            <p className="text-eyebrow mb-2">Standard Checklist</p>
            <div className="flex flex-col gap-2">
              {standard.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-[var(--ink-2)] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
                  {item}
                </label>
              ))}
              <button onClick={() => setStandard([...standard, ""])}
                className="text-xs text-[var(--ink-3)] border border-dashed border-[var(--line)] rounded-[var(--radius-sm)] py-1.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                + Añadir ítem
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="ghost">Ver trades</Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>Guardar setup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PlaybookPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <TopBar title="Playbook" subtitle="8 setups activos"
          actions={[{ label: "Nuevo setup", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />
        <div className="grid grid-cols-4 gap-3">
          {SETUPS.map(s => (
            <div key={s.abbr} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: s.color }}>
                  {s.abbr}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">{s.market}</p>
                </div>
              </div>
              {/* Sparkline placeholder */}
              <svg width="100%" height="32" viewBox="0 0 100 32">
                <polyline points="0,28 20,20 40,22 60,10 80,14 100,6"
                  fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              </svg>
              <div className="flex justify-between text-xs">
                <div>
                  <p className="text-eyebrow">Win %</p>
                  <p className="font-mono font-bold text-[var(--win)]">{s.wr}</p>
                </div>
                <div className="text-right">
                  <p className="text-eyebrow">Avg R</p>
                  <p className={cn("font-mono font-bold", s.avgR.startsWith("-") ? "text-[var(--loss)]" : "text-[var(--win)]")}>{s.avgR}</p>
                </div>
                <div className="text-right">
                  <p className="text-eyebrow">Trades</p>
                  <p className="font-mono font-bold text-[var(--ink-2)]">{s.trades}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-auto">Ver trades</Button>
            </div>
          ))}
        </div>
      </div>
      <NuevoSetupModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
