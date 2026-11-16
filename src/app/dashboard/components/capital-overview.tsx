import { currencySymbol } from "@/lib/fx"
import { CAPITAL_LABELS, summarizeCapital, type CapitalAccount } from "../capital-summary"

export function CapitalOverview({ accounts, baseCurrency }: { accounts:readonly CapitalAccount[]; baseCurrency:string }) {
  const totals = summarizeCapital(accounts)
  const kinds = (Object.keys(CAPITAL_LABELS) as (keyof typeof CAPITAL_LABELS)[]).filter(kind => accounts.some(account => account.capitalKind === kind))
  if (!accounts.length) return null
  return <section aria-label="Capital por contexto" className="mb-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {kinds.map(kind => <div key={kind}>
        <p className="text-xs text-[var(--ink-3)]">{CAPITAL_LABELS[kind]}</p>
        <p className="font-mono text-base font-semibold text-[var(--ink)]">{currencySymbol(baseCurrency)}{totals[kind].toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} {baseCurrency}</p>
      </div>)}
    </div>
    {totals.unavailableCount > 0 && <p className="mt-3 text-xs text-[var(--ink-3)]">{totals.unavailableCount} {totals.unavailableCount === 1 ? "cuenta no disponible" : "cuentas no disponibles"} para nuevas operaciones. Su historial se conserva.</p>}
  </section>
}
