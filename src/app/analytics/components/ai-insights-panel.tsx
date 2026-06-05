"use client"

import { trpc } from "@/lib/trpc/client"
import { IntelligencePanel } from "@/components/ui/intelligence-panel"

/** Analytics AI layer (WHY + WHAT NEXT). Thin wrapper over IntelligencePanel. */
export function AiInsightsPanel({ period }: { period: string }) {
  const { data: insights = [], isLoading } = trpc.analytics.insights.useQuery({ period: period as never }, { staleTime: 30_000 })
  return (
    <IntelligencePanel
      insights={insights}
      isLoading={isLoading}
      endpoint="/api/analytics-ai"
      period={period}
      title="Inteligencia IA"
      subtitle="Por qué ocurre · qué hacer después"
    />
  )
}
