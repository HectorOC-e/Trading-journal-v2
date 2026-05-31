import { trpc } from "@/lib/trpc/client"

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL"

export function useDashboardStats(period: Period = "3M") {
  const statsQuery    = trpc.trades.dashboardStats.useQuery({ period }, { staleTime: 60_000 })
  const accountsQuery = trpc.accounts.list.useQuery(undefined, { staleTime: 60_000 })

  return {
    stats:     statsQuery.data,
    accounts:  accountsQuery.data ?? [],
    isLoading: statsQuery.isLoading || accountsQuery.isLoading,
  }
}
