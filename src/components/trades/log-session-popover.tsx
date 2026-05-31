"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { TradeSession } from "@/types"

const SESSION_OPTIONS: { value: TradeSession; label: string }[] = [
  { value: "London",       label: "London" },
  { value: "New York",     label: "New York" },
  { value: "Asia",         label: "Asia" },
  { value: "London Close", label: "London Close" },
]

const MOOD_LABELS: Record<number, string> = { 1: "Muy mal", 2: "Mal", 3: "Normal", 4: "Bien", 5: "Excelente" }
const ENERGY_LABELS: Record<number, string> = { 1: "Sin energía", 2: "Bajo", 3: "Normal", 4: "Activo", 5: "Muy activo" }

function RatingBar({
  value, onChange, labels,
}: { value: number | null; onChange: (v: number) => void; labels: Record<number, string> }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex-1 h-8 rounded-[var(--radius-sm)] text-xs font-semibold transition-all",
            value === n
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]",
          )}
        >
          {n}
        </button>
      ))}
      {value != null && (
        <span className="text-xs text-[var(--ink-3)] ml-1 self-center whitespace-nowrap">
          {labels[value]}
        </span>
      )}
    </div>
  )
}

export function LogSessionPopover({
  open,
  onOpenChange,
}: {
  open:           boolean
  onOpenChange:   (v: boolean) => void
}) {
  const today = new Date().toISOString().slice(0, 10)

  const [session,     setSession]     = useState<TradeSession>("New York")
  const [preMood,     setPreMood]     = useState<number | null>(null)
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [notes,       setNotes]       = useState("")
  const [saved,       setSaved]       = useState(false)

  const logSession = trpc.tradingSessions.log.useMutation({
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onOpenChange(false)
        setPreMood(null)
        setEnergyLevel(null)
        setNotes("")
      }, 800)
    },
  })

  const handleSave = () => {
    logSession.mutate({
      date:        today,
      session,
      preMood:     preMood     ?? undefined,
      energyLevel: energyLevel ?? undefined,
      notes,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Log de sesión</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-eyebrow mb-2">Sesión</p>
            <div className="flex gap-1.5 flex-wrap">
              {SESSION_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSession(value)}
                  className={cn(
                    "flex-1 min-w-[90px] py-1.5 px-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors",
                    session === value
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-eyebrow mb-2">Estado de ánimo pre-sesión</p>
            <RatingBar value={preMood} onChange={setPreMood} labels={MOOD_LABELS} />
          </div>

          <div>
            <p className="text-eyebrow mb-2">Nivel de energía</p>
            <RatingBar value={energyLevel} onChange={setEnergyLevel} labels={ENERGY_LABELS} />
          </div>

          <div>
            <p className="text-eyebrow mb-1.5">Notas (opcional)</p>
            <Textarea
              placeholder="¿Hay algo que pueda afectar tu trading hoy?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {saved && (
            <p className="text-xs text-[var(--win)] text-center font-semibold">Sesión registrada</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={logSession.isPending}
          >
            {logSession.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
