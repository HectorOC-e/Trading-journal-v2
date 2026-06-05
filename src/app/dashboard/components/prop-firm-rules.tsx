import { RuleBar } from "@/components/ui/rule-bar"
import type { RouterOutputs } from "@/server/trpc/root"

type PropFirmStatus = RouterOutputs["trades"]["dashboardStats"]["propFirmStatus"]

export function PropFirmRules({ propFirmStatus }: { propFirmStatus: PropFirmStatus }) {
  if (propFirmStatus.length === 0) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
      <p className="text-[13px] font-semibold text-[var(--ink)]">Reglas Prop Firm · progreso</p>
      <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">
        Risk engine evalúa estos límites antes de aceptar cada nuevo trade.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {propFirmStatus.map(a => (
          <div key={a.accountId}
            className="rounded-[var(--radius-sm)] p-4 flex flex-col gap-3"
            style={{
              border: `1px solid ${a.status === "OK" ? "var(--win)" : "var(--loss)"}`,
              background: a.status === "OK" ? "var(--win-soft)" : "var(--loss-soft)",
            }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{a.name}</p>
              <span className="text-[10px] font-bold tracking-wider"
                style={{ color: a.status === "OK" ? "var(--win)" : "var(--loss)" }}>
                {a.status}
              </span>
            </div>
            <RuleBar label="Max drawdown total" usedPct={a.ddPctUsed}    displayRight={`${a.ddActualPct.toFixed(1)}% / ${a.ddLimitPct.toFixed(1)}%`} />
            <RuleBar label="Pérdida diaria"      usedPct={a.dailyLossPct} displayRight={`${a.dailyActualPct.toFixed(1)}% / ${a.dailyLimitPct.toFixed(1)}%`} />
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--ink-2)]">Trades / día</span>
                <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">
                  <span style={{ color: a.tradesMax > 0 && a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--ink)" }}>{a.tradesUsed}</span>
                  <span className="text-[var(--ink-3)]"> / {a.tradesMax > 0 ? a.tradesMax : "∞"}</span>
                </span>
              </div>
              {a.tradesMax > 0 && (
                <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((a.tradesUsed / a.tradesMax) * 100, 100)}%`,
                      background: a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--win)",
                    }} />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--ink-3)]">
              Símbolos permitidos: <span className="text-[var(--ink-2)] font-medium">
                {a.allowedSymbols.join(", ") || "—"}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
