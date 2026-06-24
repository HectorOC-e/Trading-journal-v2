"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { EASE_OUT } from "@/lib/motion"
import { currencySymbol } from "@/lib/fx"
import { CardEquityChart } from "./card-equity-chart"
import { deriveVerdict } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type ReportData = RouterOutputs["weeklyReviews"]["report"]

function HeroMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-[20px] leading-none" style={{ color: color ?? "var(--ink)" }}>{value}</span>
      <span className="text-[10px] font-medium mt-1 uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  )
}

/**
 * The live "current week" card at the top of /reviews. Auto-fills from the week's
 * trades (auto-draft) and links into the rich report. Shows a one-line AI preview
 * when an analysis already exists; the week is finalized automatically on Monday.
 */
export function WeekHero({ data, weekStart, isLoading }: {
  data?: ReportData
  weekStart: string
  isLoading: boolean
}) {
  if (isLoading || !data) {
    return <div className="h-[148px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse" />
  }

  const cur = currencySymbol(data.baseCurrency || "USD")
  const money = (n: number) => `${n < 0 ? "-" : "+"}${cur}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  const net = data.kpis.netPnl
  const isLoss = net < 0
  const hasTrades = data.kpis.trades > 0
  const dailyPnl = data.dayTrend.map(d => d.pnl)

  const aiPreview = data.ai.analysis
    ? deriveVerdict({ aiAnalysis: data.ai.analysis, netPnl: net, winRate: data.kpis.winRate, disciplineScore: data.kpis.disciplineScore, trades: data.kpis.trades })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="relative rounded-[var(--radius)] border border-[var(--accent)]/30 overflow-hidden"
      style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, var(--panel)), var(--panel))" }}
    >
      <Link href={`/reviews/semanal/${weekStart}`} className="block p-4 sm:p-5 group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Semana en curso · se actualiza sola
            </p>
            <p className="text-[17px] font-bold mt-1" style={{ color: "var(--ink)" }}>{data.weekLabel}</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "var(--be-soft)", color: "var(--be)" }}>
            Se finaliza el lunes
          </span>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
          <HeroMetric label="P&L"        value={data.kpis.trades ? money(net) : "—"} color={data.kpis.trades ? (isLoss ? "var(--loss)" : "var(--win)") : undefined} />
          <HeroMetric label="Win Rate"   value={data.kpis.trades ? `${data.kpis.winRate.toFixed(0)}%` : "—"} />
          <HeroMetric label="Avg R"      value={data.analytics.avgR ? `${data.analytics.avgR.toFixed(2)}R` : "—"} />
          <HeroMetric label="Disciplina" value={data.kpis.disciplineScore != null ? String(data.kpis.disciplineScore) : "—"} />
          <div className="hidden sm:flex flex-1 min-w-[140px] justify-end items-center">
            {hasTrades
              ? <CardEquityChart dailyPnl={dailyPnl} positive={!isLoss} money={money} width={224} height={46} />
              : <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>Sin operaciones aún</span>}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
          <p className="text-[12px] inline-flex items-center gap-1.5 min-w-0" style={{ color: "var(--ink-3)" }}>
            <Sparkles size={13} className="shrink-0" style={{ color: "var(--accent)" }} />
            <span className="truncate">{aiPreview ?? "El análisis IA se completa al cerrar la semana."}</span>
          </p>
          <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium group-hover:gap-1.5 transition-[gap]" style={{ color: "var(--accent)" }}>
            Abrir <ArrowRight size={13} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
