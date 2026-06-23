"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { staggerContainer, fadeUpItem } from "@/lib/motion"
import { makeMoney, Card, Eyebrow } from "./primitives"
import { DownloadPdfButton } from "./download-pdf-button"
import { PnlTrendChart } from "./charts"
import {
  KpiGrid, DayExtremes, DisciplinePanel, SetupBreakdown, SessionBreakdown, AccountBreakdown, NarrativeCard,
} from "./sections"
import type { ReviewReportVM } from "./view-model"

/**
 * One component tree for both weekly & monthly review reports. Driven by the
 * normalized `ReviewReportVM`. `aiSlot` is where the AI analysis card mounts
 * (Phase 2); `actions` lets a page inject extra header buttons (e.g. send-email).
 */
export function ReviewReportShell({ vm, aiSlot, actions }: {
  vm: ReviewReportVM
  aiSlot?: React.ReactNode
  actions?: React.ReactNode
}) {
  const money = makeMoney(vm.baseCurrency)

  return (
    <div className="max-w-[900px] mx-auto pb-12">
      {/* Header — hidden in print */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Link href={vm.backHref} className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} /> Reviews
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <DownloadPdfButton kind={vm.kind} period={vm.printPeriod} />
        </div>
      </div>

      <h1 className="text-[22px] font-bold text-[var(--ink)]">{vm.title}</h1>
      <p className="text-sm text-[var(--ink-3)] mb-5">{vm.subtitle}</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={fadeUpItem}>
          <KpiGrid kpis={vm.kpis} deltas={vm.deltas} money={money} />
        </motion.div>

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

        <div className="grid md:grid-cols-2 gap-5">
          <SetupBreakdown setups={vm.setups} money={money} />
          <SessionBreakdown sessions={vm.sessions} money={money} />
        </div>

        <AccountBreakdown byAccount={vm.byAccount} money={money} />

        {vm.narrative && <NarrativeCard narrative={vm.narrative} />}
      </motion.div>
    </div>
  )
}
