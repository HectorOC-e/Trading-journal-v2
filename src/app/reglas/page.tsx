"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { FilterBar } from "@/components/ui/filter-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockRules } from "@/mock-data"
import type { RulesSeverity } from "@/types"

const FILTER_OPTIONS = [
  { value: "todas",         label: "Todas" },
  { value: "personalizadas",label: "Personalizadas" },
  { value: "registro",      label: "Registro" },
]

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div className={cn("w-9 h-5 rounded-full relative transition-colors shrink-0", enabled ? "bg-[var(--win)]" : "bg-[var(--line)]")}>
      <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all", enabled ? "left-4" : "left-0.5")} />
    </div>
  )
}

const SEVERITIES: { value: RulesSeverity; activeClass: string; dot: string }[] = [
  { value: "CRÍTICA",     activeClass: "bg-[var(--loss)] text-white",   dot: "bg-[var(--loss)]" },
  { value: "MENOR",       activeClass: "bg-[var(--be)] text-white",     dot: "bg-[var(--be)]" },
  { value: "INFORMACIÓN", activeClass: "bg-[var(--accent)] text-white", dot: "bg-[var(--accent)]" },
]

function NuevaReglaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [severity, setSeverity] = useState<RulesSeverity>("CRÍTICA")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader><DialogTitle>Nueva regla CUSTOM</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-eyebrow block mb-1.5">Nombre *</label>
            <Input placeholder="Ej. Promediar pérdida" />
          </div>
          <div>
            <label className="text-eyebrow block mb-1.5">Descripción *</label>
            <Textarea placeholder="¿Qué comportamiento detecta esta regla?" />
          </div>
          <div>
            <p className="text-eyebrow mb-2">Severidad</p>
            <div className="flex gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} onClick={() => setSeverity(s.value)}
                  className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                    severity === s.value ? s.activeClass : "bg-[var(--chip)] text-[var(--ink-2)]"
                  )}>
                  {severity !== s.value && <span className={cn("w-2 h-2 rounded-full", s.dot)} />}
                  {s.value}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReglasPage() {
  const [filter, setFilter] = useState("todas")
  const [modalOpen, setModalOpen] = useState(false)
  const systemRules = mockRules.filter(r => r.isSystem)

  return (
    <>
      <div>
        <TopBar title="Reglas de conducta"
          subtitle="4 reglas del sistema · 4 personalizadas · 7 Violaciones este mes"
          actions={[{ label: "Nueva regla", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />
        <FilterBar options={FILTER_OPTIONS} value={filter} onChange={setFilter} className="mb-6" />

        {/* System rules */}
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-[var(--line)]">
            <p className="text-eyebrow">Reglas Sistema · automáticas</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {systemRules.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">🚫</span>
                <p className="flex-1 text-sm text-[var(--ink)]">{r.name}</p>
                <Badge variant="auto">AUTO</Badge>
                <Badge variant="critica">CRÍTICA</Badge>
                <Toggle enabled={r.enabled} />
                <span className="font-mono text-xs font-bold text-[var(--loss)] w-12 text-right">
                  {r.violationsThisMonth} viol.
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom rules empty state */}
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center">
          <p className="text-sm text-[var(--ink-3)] mb-3">No hay reglas personalizadas. Crea la primera.</p>
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nueva regla
          </Button>
        </div>
      </div>
      <NuevaReglaModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
