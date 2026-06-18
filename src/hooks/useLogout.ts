"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { clearSessionStorageKeys } from "@/lib/storage-keys"

/**
 * Sign the user out and wipe all client-side cached data.
 *
 * The React Query `QueryClient` lives for the lifetime of the browser tab, so a
 * bare `supabase.auth.signOut()` leaves the previous user's cached queries
 * (resources, trades, dashboard, etc.) in memory. If another account logs in on
 * the same tab those stale entries are served until each query refetches — a
 * cross-account data leak (e.g. the learning coach surfacing the prior user's
 * resources). Clearing the cache on logout closes that hole.
 *
 * The same applies to session-scoped localStorage (e.g. the AI coach chat
 * history) — wipe it so a new login never inherits the previous conversation.
 *
 * Uses `router.replace` so the authenticated page is not left in history.
 */
export function useLogout() {
  const router      = useRouter()
  const queryClient = useQueryClient()

  return useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    clearSessionStorageKeys()
    router.replace("/login")
    router.refresh()
  }, [router, queryClient])
}
