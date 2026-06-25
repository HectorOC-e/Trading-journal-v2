"use client"

// Compact "Resumen del periodo" card for the Reviews index rail: traded-week count,
// trailing green-week streak, and the best/worst week by net P&L for the active
// window (whole history or the year/month filter). Data from weeklyReviews.overview.

import type { RouterOutputs } from "@/server/trpc/root"

type Summary = RouterOutputs["weeklyReviews"]["overview"]["summary"]

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`

function Row({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11.5px] text-[var(--ink-3)]">{label}</span>
      <span className="flex items-baseline gap-1.5 min-w-0">
        {sub && <span className="text-[10px] text-[var(--ink-3)] truncate">{sub}</span>}
        <span className="font-mono font-bold text-[12.5px]" style={{ color: color ?? "var(--ink)" }}>{value}</span>
      </span>
    </div>
  )
}

export function PeriodSummary({ summary }: { summary: Summary }) {
  if (summary.weeks === 0) return null

  return (
    <div className="rounded-[11px] border border-[var(--line)] bg-[var(--panel)] p-3.5 flex flex-col gap-2.5">
      <div className="text-[10px] font-bold tracking-[0.13em] text-[var(--ink-3)]">RESUMEN DEL PERIODO</div>
      <Row label="Semanas" value={String(summary.weeks)} />
      <Row label="Racha verde" value={summary.greenStreak > 0 ? `${summary.greenStreak} sem.` : "—"} color={summary.greenStreak > 0 ? "var(--win)" : undefined} />
      {summary.best && (
        <Row label="Mejor semana" sub={summary.best.label} value={money(summary.best.net)} color={summary.best.net >= 0 ? "var(--win)" : "var(--loss)"} />
      )}
      {summary.worst && (
        <Row label="Peor semana" sub={summary.worst.label} value={money(summary.worst.net)} color={summary.worst.net >= 0 ? "var(--win)" : "var(--loss)"} />
      )}
    </div>
  )
}
