"use client"

import { useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { useQuickActions } from "@/lib/quick-actions-store"
import { RegisterTradeModal } from "@/components/trades/register-trade-modal"


/**
 * Global Quick Actions (Fase 3 · resolves M2).
 * - The "Nuevo Trade" action opens the SAME RegisterTradeModal used in /trades,
 *   mounted once here so it is reachable from every screen. It is triggered by the
 *   sidebar "+" (desktop/tablet), the navbar center "+" (mobile), and the "n"
 *   keyboard shortcut — all via the shared store. No floating speed-dial.
 */
export function QuickActions() {
  const { registerOpen, openRegister, closeRegister } = useQuickActions()

  // Keyboard shortcut: "n" opens Nuevo Trade (ignores typing contexts).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "n" || e.key === "N") { e.preventDefault(); openRegister() }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openRegister])

  // ── Data for the register modal ──────────────────────────────────────────
  const utils = trpc.useUtils()
  // Only fetch the register-form data when the modal is actually open — these
  // would otherwise run on EVERY page (this component is global) and add needless
  // DB connection pressure on serverless.
  const q = { enabled: registerOpen, staleTime: 60_000 }
  const { data: accounts = [] } = trpc.accounts.list.useQuery(undefined, q)
  const { data: setups = [] }   = trpc.setups.list.useQuery(undefined, q)
  const { data: markets = [] }  = trpc.markets.list.useQuery(undefined, q)
  const { data: tagRows = [] } = trpc.tags.list.useQuery(undefined, q)
  const customTags = (tagRows as { name: string; isSystem: boolean }[]).filter(t => !t.isSystem).map(t => t.name)

  const createTrade = trpc.trades.create.useMutation({
    onSuccess: () => {
      utils.trades.list.invalidate()
      utils.trades.dashboardStats.invalidate()
      utils.accounts.list.invalidate()
      closeRegister()
      toast.success("Trade registrado")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  return (
    <>
      {/* The "Nuevo trade" action lives in the sidebar (desktop/tablet) and the
          navbar center "+" (mobile). This component only hosts the shared modal
          and the "n" keyboard shortcut — no floating speed-dial. */}
      <RegisterTradeModal
        open={registerOpen}
        onOpenChange={(v) => { if (!v) closeRegister() }}
        accounts={accounts}
        setups={setups}
        markets={markets}
        customTags={customTags}
        onSubmit={(form) => {
          createTrade.mutate({
            accountId:        form.accountId,
            setupId:          form.setupId || undefined,
            direction:        form.direction,
            symbol:           form.symbol.toUpperCase(),
            entry:            parseFloat(form.entry),
            stop:             parseFloat(form.stop),
            target:           parseFloat(form.target),
            size:             parseFloat(form.size),
            date:             form.date,
            openTime:         form.openTime,
            session:          form.session,
            tags:             form.tags,
            notes:            form.notes,
            planNotes:        form.planNotes,
            screenshotUrls:   form.screenshots,
            emotionBefore:    form.emotionBefore ?? undefined,
            confidenceRating: form.confidenceRating,
            executionQuality: form.executionQuality,
            fomoFlag:         form.fomoFlag,
            revengeFlag:      form.revengeFlag,
          })
        }}
      />
    </>
  )
}
