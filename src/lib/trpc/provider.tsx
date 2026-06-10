"use client"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { trpc } from "./client"

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // Without defaults React Query uses staleTime: 0, so every navigation back to
  // a page (e.g. the dashboard's 9 queries) refetches from scratch, and every
  // window focus triggers a refetch storm. Treat data as fresh for 30s, skip
  // focus refetches (mutations invalidate explicitly), and retry once.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))
  const [trpcClient]  = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc" })],
    })
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
