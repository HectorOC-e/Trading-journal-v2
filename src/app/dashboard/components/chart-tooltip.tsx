export interface TooltipPayload { dataKey: string; name: string; value: number; color: string }

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--ink-3)] mb-1.5 font-medium">{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}
