import { trpc } from "@/lib/trpc/client"
import { useOperationalMode } from "@/lib/operational-mode-store"
import { classifyAccountType } from "@/domains/trading/operational-mode"

export type Period = "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"

export function useDashboardStats(period: Period = "3M") {
  const mode = useOperationalMode(s => s.mode)
  const statsQuery    = trpc.trades.dashboardStats.useQuery({ period, mode }, { staleTime: 60_000 })
  const accountsQuery = trpc.accounts.list.useQuery({includeInactive:true}, { staleTime: 60_000 })

  return {
    stats:     statsQuery.data,
    accounts:  (accountsQuery.data ?? []).filter(account=>classifyAccountType(account.type)===mode),
    mode,
    isLoading: statsQuery.isLoading || accountsQuery.isLoading,
    isError:   statsQuery.isError   || accountsQuery.isError,
    error:     statsQuery.error     ?? accountsQuery.error,
  }
}
