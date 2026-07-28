"use client"

// ─────────────────────────────────────────────────────────────────────────────
// EmotionCapture — el gesto, en un solo sitio.
//
// Se monta en el panel del trade cerrado y en la review semanal. Que exista
// evita que las dos superficies dupliquen los chips, la mutación y la regla de
// ventana, que es como este proyecto acabó con cinco variantes del bucle de
// candidatos de IA antes de #171.
//
// La ventana que este componente respeta es COMPORTAMIENTO DE UI. La regla la
// impone el servidor (`assertEmotionWindowOpen`): esconder los chips es
// cortesía, no control de acceso.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { EMOTION_OPTIONS, type EmotionBefore } from "@/domains/trading/emotions"

export function EmotionCapture({
  tradeId, current, withinWindow, onCaptured,
}: {
  tradeId:      string
  current:      string | null
  withinWindow: boolean
  onCaptured?:  () => void
}) {
  const [selected, setSelected] = useState<string | null>(current)
  const capture = trpc.trades.captureEmotion.useMutation({ onSuccess: () => onCaptured?.() })

  if (!withinWindow) {
    if (!selected) return null
    const label = EMOTION_OPTIONS.find(o => o.value === selected)?.label ?? selected
    return <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOTION_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          disabled={capture.isPending}
          onClick={() => { setSelected(value); capture.mutate({ tradeId, emotion: value as EmotionBefore }) }}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50",
            selected === value
              ? "bg-[var(--be)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
