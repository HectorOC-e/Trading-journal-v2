"use client"

import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { useOperationalMode } from "@/lib/operational-mode-store"
import { MODE_LABELS, OPERATIONAL_MODES, operationalModeSchema } from "@/domains/trading/operational-mode"

export function OperationalModeSelector({className=""}:{className?:string}) {
  const mode = useOperationalMode(state=>state.mode)
  const setMode = useOperationalMode(state=>state.setMode)
  return <SegmentedTabs
    ariaLabel="Modalidad de operativa"
    variant="pill"
    className={className}
    value={mode}
    options={OPERATIONAL_MODES.map(value=>({value,label:MODE_LABELS[value]}))}
    onChange={value=>setMode(operationalModeSchema.parse(value))}
  />
}
