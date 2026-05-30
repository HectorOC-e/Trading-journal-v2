import { trpc } from "@/lib/trpc/client"

export function useDashboardStats() {
  const statsQuery    = trpc.trades.dashboardStats.useQuery(undefined, { staleTime: 60_000 })
  const accountsQuery = trpc.accounts.list.useQuery(undefined, { staleTime: 60_000 })

  return {
    stats:     statsQuery.data,
    accounts:  accountsQuery.data ?? [],
    isLoading: statsQuery.isLoading || accountsQuery.isLoading,
  }
}
