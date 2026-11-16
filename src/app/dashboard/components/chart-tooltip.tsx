import { currencySymbol } from "@/lib/fx"

export interface TooltipPayload { dataKey: string; name: string; value: number; color: string }

export function ChartTooltip({ active, payload, label, currency, unit }: { active?: boolean; payload?: TooltipPayload[]; label?: string; currency?:string; unit?:string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--ink-3)] mb-1.5 font-medium">{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {currency ? `${p.value < 0 ? "-" : ""}${currencySymbol(currency)}${Math.abs(p.value).toLocaleString("en-US")}` : unit ? `${p.value}${unit}` : typeof p.value === "number" && p.value > 1000 ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}
