"use client"

import { usePracticeScope } from "@/lib/practice-scope-store"

/**
 * Global switch to fold demo/backtest ("practice") accounts into the financial /
 * performance views. Off by default — unreal money never inflates real stats.
 * Behavioural metrics (psychology / discipline) ignore this and always count
 * practice, so this control only affects financial figures.
 */
export function PracticeToggle({ className = "" }: { className?: string }) {
  const includePractice = usePracticeScope((s) => s.includePractice)
  const toggle          = usePracticeScope((s) => s.toggle)

  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none text-[12px] text-[var(--ink-2)] ${className}`}
      title="Las cuentas de práctica (demo/backtest) manejan dinero irreal y se excluyen del rendimiento real por defecto."
    >
      <input
        type="checkbox"
        role="switch"
        checked={includePractice}
        onChange={toggle}
        className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
        aria-label="Incluir cuentas de práctica (demo y backtesting) en las estadísticas financieras"
      />
      <span>
        Incluir práctica <span className="text-[var(--ink-3)]">(demo/backtest)</span>
      </span>
    </label>
  )
}
