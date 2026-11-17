"use client"

import { trpc } from "@/lib/trpc/client"
import { IntelligencePanel } from "@/components/ui/intelligence-panel"
import type { OperationalMode } from "@/domains/trading/operational-mode"

/** Analytics AI layer (WHY + WHAT NEXT). Thin wrapper over IntelligencePanel. */
export function AiInsightsPanel({ period, mode }: { period: string; mode: OperationalMode }) {
  const { data: insights = [], isLoading } = trpc.analytics.insights.useQuery({ period: period as never, mode }, { staleTime: 30_000 })
  return (
    <IntelligencePanel
      insights={insights}
      isLoading={isLoading}
      endpoint="/api/analytics-ai"
      period={period}
      mode={mode}
      title="Inteligencia IA"
      subtitle="Por qué ocurre · qué hacer después"
    />
  )
}
