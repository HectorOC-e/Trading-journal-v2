import { trpc } from "@/lib/trpc/client"
import { usePracticeScope } from "@/lib/practice-scope-store"

export type Period = "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"

export function useDashboardStats(period: Period = "3M") {
  const includePractice = usePracticeScope(s => s.includePractice)
  const statsQuery    = trpc.trades.dashboardStats.useQuery({ period, includePractice }, { staleTime: 60_000 })
  const accountsQuery = trpc.accounts.list.useQuery(undefined, { staleTime: 60_000 })

  return {
    stats:     statsQuery.data,
    accounts:  accountsQuery.data ?? [],
    isLoading: statsQuery.isLoading || accountsQuery.isLoading,
    isError:   statsQuery.isError   || accountsQuery.isError,
    error:     statsQuery.error     ?? accountsQuery.error,
  }
}
