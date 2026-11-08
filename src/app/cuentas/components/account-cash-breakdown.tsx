"use client"

import { formatMoney } from "@/lib/format/money"
import type { RawAccount } from "./account-card"

export function AccountCashBreakdown({ account }: { account: RawAccount }) {
  const money = (value: number, signed = false) => formatMoney(value, { currency: account.currency, decimals: 2, signed })
  const rows = [
    { label: "Capital inicial", value: account.initialBalance },
    { label: "Resultado realizado", value: account.realizedPnl, signed: true },
    { label: "Ajustes de conciliación", value: account.balanceCorrection, signed: true },
    { label: "Retiros pagados", value: -account.paidWithdrawals, signed: true },
    { label: "Saldo actual", value: account.currentBalance, total: true },
    { label: "Reservado para retiros", value: -account.reservedWithdrawals, signed: true },
    { label: "Disponible", value: account.availableBalance, total: true },
  ]
  return (
    <section aria-label="Cómo se calcula tu saldo" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Cómo se calcula tu saldo</h3>
      <p className="mt-1 text-xs text-[var(--ink-3)]">Importes en {account.currency}. Los retiros no cambian tu resultado de operativa.</p>
      <dl className="mt-3 space-y-2 text-xs">
        {rows.map(row => (
          <div key={row.label} className={`flex items-baseline justify-between gap-3 ${row.total ? "border-t border-[var(--line)] pt-2 font-semibold" : ""}`}>
            <dt className="text-[var(--ink-2)]">{row.label}</dt>
            <dd className="font-mono tabular-nums text-right break-all">{money(row.value, row.signed)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
