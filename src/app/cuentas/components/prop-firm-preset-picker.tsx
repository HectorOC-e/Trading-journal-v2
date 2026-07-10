"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

export type PropFirmPreset = RouterOutputs["propFirmPresets"]["list"][number]

const PHASE_LABEL: Record<string, string> = {
  PHASE_1: "Phase 1", PHASE_2: "Phase 2", FUNDED: "Funded",
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border transition-colors",
        active ? "bg-[var(--accent)] text-white border-[var(--accent)]"
               : "bg-[var(--chip)] text-[var(--ink-2)] border-transparent hover:text-[var(--ink)]"
      )}>
      {children}
    </button>
  )
}

/**
 * Cascading Firm → Program → Phase picker over the curated prop-firm catalog.
 * Selecting a phase calls `onApply(preset)`; the parent copies the preset's rule
 * fields into the form (a snapshot — see plan §3, no FK is stored beyond presetId).
 * "Personalizado" clears the selection so fields stay manually editable.
 */
export function PropFirmPresetPicker({ presetId, onApply, onCustom }: {
  presetId: string
  onApply: (preset: PropFirmPreset) => void
  onCustom: () => void
}) {
  const { data: presets, isLoading } = trpc.propFirmPresets.list.useQuery(undefined, { staleTime: 5 * 60_000 })
  const [firm, setFirm]       = useState<string | null>(null)
  const [program, setProgram] = useState<string | null>(null)

  // Seed the cascade from an already-selected preset (edit flow), or clear it when
  // pointed at a preset-less account. Only re-runs on presetId/data change, so it
  // never fights the user mid-cascade (Firm/Program clicks don't touch presetId).
  useEffect(() => {
    if (!presets) return
    if (!presetId) { setFirm(null); setProgram(null); return }
    const p = presets.find(x => x.id === presetId)
    if (p) { setFirm(p.firm); setProgram(p.program) }
  }, [presets, presetId])

  const firms = useMemo(() => presets ? [...new Set(presets.map(p => p.firm))] : [], [presets])
  const programs = useMemo(
    () => presets && firm ? [...new Set(presets.filter(p => p.firm === firm).map(p => p.program))] : [],
    [presets, firm])
  const phases = useMemo(
    () => presets && firm && program ? presets.filter(p => p.firm === firm && p.program === program) : [],
    [presets, firm, program])

  const selected = presets?.find(p => p.id === presetId) ?? null

  if (isLoading) return <p className="text-[11px] text-[var(--ink-3)]">Cargando catálogo…</p>
  if (!presets || presets.length === 0) return null

  return (
    <div className="flex flex-col gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
      <p className="text-[12px] font-semibold text-[var(--ink)]">Preset de firma prop</p>
      <div>
        <label className="text-eyebrow block mb-1.5">Firma</label>
        <div className="flex gap-1.5 flex-wrap">
          <Chip active={firm === null && !selected}
            onClick={() => { setFirm(null); setProgram(null); onCustom() }}>
            Personalizado
          </Chip>
          {firms.map(f => (
            <Chip key={f} active={firm === f} onClick={() => { setFirm(f); setProgram(null) }}>{f}</Chip>
          ))}
        </div>
      </div>

      {firm && programs.length > 0 && (
        <div>
          <label className="text-eyebrow block mb-1.5">Programa</label>
          <div className="flex gap-1.5 flex-wrap">
            {programs.map(pr => (
              <Chip key={pr} active={program === pr} onClick={() => setProgram(pr)}>{pr}</Chip>
            ))}
          </div>
        </div>
      )}

      {firm && program && phases.length > 0 && (
        <div>
          <label className="text-eyebrow block mb-1.5">Fase</label>
          <div className="flex gap-1.5 flex-wrap">
            {phases.map(p => (
              <Chip key={p.id} active={p.id === presetId} onClick={() => onApply(p)}>
                {PHASE_LABEL[p.phase] ?? p.phase}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <p className="text-[10px] text-[var(--ink-3)]">
          Aplicado:{" "}
          <span className="text-[var(--ink-2)] font-medium">
            {selected.firm} · {selected.program} · {PHASE_LABEL[selected.phase] ?? selected.phase}
          </span>
          {" "}— rellenó los límites de abajo (editable).
        </p>
      )}
    </div>
  )
}
