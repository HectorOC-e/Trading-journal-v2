"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { staggerContainer, fadeUpItem } from "@/lib/motion"
import { makeMoney, Card, Eyebrow } from "./primitives"
import { DownloadPdfButton } from "./download-pdf-button"
import { PnlTrendChart, EquityCurveChart } from "./charts"
import {
  KpiGrid, ExtraKpis, DayExtremes, DisciplinePanel, SetupBreakdown, SessionBreakdown,
  MarketsBreakdown, PsychologyPanel, AccountBreakdown, NarrativeCard,
} from "./sections"
import type { ReviewReportVM } from "./view-model"
import { useOperationalMode } from "@/lib/operational-mode-store"
import { MODE_LABELS } from "@/domains/trading/operational-mode"

/**
 * One component tree for both weekly & monthly review reports. Driven by the
 * normalized `ReviewReportVM`. `aiSlot` is where the AI analysis card mounts
 * (Phase 2); `actions` lets a page inject extra header buttons (e.g. send-email).
 */
export function ReviewReportShell({ vm, aiSlot, actions, notesSlot, learningSlot, letterSlot, excludedCurrencies = [] }: {
  vm: ReviewReportVM
  aiSlot?: React.ReactNode
  actions?: React.ReactNode
  notesSlot?: React.ReactNode
  learningSlot?: React.ReactNode
  /** Monthly "Carta del Gestor" — renders above the analytical sections (the anexo). */
  letterSlot?: React.ReactNode
  excludedCurrencies?: string[]
}) {
  const mode = useOperationalMode(s => s.mode)
  const money = makeMoney(vm.baseCurrency)

  return (
    <div className="max-w-[900px] mx-auto pb-12">
      {/* Header — hidden in print */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Link href={`${vm.backHref}${vm.backHref.includes("?") ? "&" : "?"}mode=${mode}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} /> Reviews
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <DownloadPdfButton kind={vm.kind} period={vm.printPeriod} />
        </div>
      </div>

      <h1 className="text-[22px] font-bold text-[var(--ink)]">{vm.title}</h1>
      <p className="text-sm text-[var(--ink-3)] mb-5">{vm.subtitle}</p>
      <p className="text-xs text-[var(--ink-3)] mb-5">{MODE_LABELS[mode]} · Resultados por fecha de mercado de las operaciones.</p>
      {excludedCurrencies.length > 0 && <p role="alert" className="mb-5 rounded-[var(--radius-sm)] border border-[var(--line)] p-3 text-sm text-[var(--ink-2)]">Importes incompletos: se excluyeron operaciones en {excludedCurrencies.join(", ")} porque falta un tipo de cambio verificable a {vm.baseCurrency}. Los importes mostrados cubren sólo las divisas convertibles.</p>}

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
        {letterSlot && <motion.div variants={fadeUpItem}>{letterSlot}</motion.div>}

        <motion.div variants={fadeUpItem}>
          <KpiGrid kpis={vm.kpis} deltas={vm.deltas} money={money} />
        </motion.div>

        <motion.div variants={fadeUpItem}>
          <ExtraKpis analytics={vm.analytics} money={money} />
        </motion.div>

        {vm.kpis.trades > 0 && (
          <motion.div variants={fadeUpItem}>
            <Card>
              <Eyebrow>Curva de equity · P&amp;L acumulado</Eyebrow>
              <EquityCurveChart points={vm.analytics.equityCurve} money={money} />
            </Card>
          </motion.div>
        )}

        {aiSlot && <motion.div variants={fadeUpItem}>{aiSlot}</motion.div>}

        <Card>
          <Eyebrow>{vm.trend.eyebrow}</Eyebrow>
          {vm.kpis.trades === 0
            ? <p className="text-sm text-[var(--ink-3)]">Sin trades en este periodo.</p>
            : <PnlTrendChart points={vm.trend.points} money={money} />}
        </Card>

        <div className="grid md:grid-cols-2 gap-5">
          <DayExtremes bestDay={vm.bestDay} worstDay={vm.worstDay} money={money} />
          <DisciplinePanel discipline={vm.discipline} score={vm.kpis.disciplineScore} money={money} />
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <SetupBreakdown setups={vm.setups} money={money} />
          <SessionBreakdown sessions={vm.sessions} money={money} />
          <MarketsBreakdown markets={vm.analytics.markets} money={money} />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <PsychologyPanel byEmotion={vm.analytics.byEmotion} money={money} pendingEmotion={vm.pendingEmotion} />
          <AccountBreakdown byAccount={vm.byAccount} money={money} />
        </div>

        {learningSlot && <motion.div variants={fadeUpItem}>{learningSlot}</motion.div>}

        {vm.narrative && <NarrativeCard narrative={vm.narrative} />}

        {notesSlot && <motion.div variants={fadeUpItem}>{notesSlot}</motion.div>}
      </motion.div>
    </div>
  )
}
