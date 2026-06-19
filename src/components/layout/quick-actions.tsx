"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, TrendingUp, Activity, ClipboardList, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { useQuickActions } from "@/lib/quick-actions-store"
import { useAnyDialogOpen } from "@/lib/dialog-open-store"
import { RegisterTradeModal } from "@/components/trades/register-trade-modal"


/**
 * Global Quick Actions (Fase 3 · resolves M2).
 * - Desktop/tablet: a speed-dial FAB (bottom-left, away from the AI Coach on the right).
 * - The "Nuevo Trade" action opens the SAME RegisterTradeModal used in /trades,
 *   mounted once here so it is reachable from every screen.
 * - The mobile navbar center "+" triggers the same modal via the shared store.
 */
export function QuickActions() {
  const router = useRouter()
  const [dialOpen, setDialOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { registerOpen, openRegister, closeRegister } = useQuickActions()
  const anyDialogOpen = useAnyDialogOpen()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

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

  const dialActions = [
    { label: "Nuevo trade",  icon: <TrendingUp size={16} />,    onClick: () => { setDialOpen(false); openRegister() } },
    { label: "Log sesión",   icon: <Activity size={16} />,      onClick: () => { setDialOpen(false); router.push("/trades") } },
    { label: "Nueva review", icon: <ClipboardList size={16} />, onClick: () => { setDialOpen(false); router.push("/reviews") } },
  ]

  return (
    <>
      {/* Speed-dial FAB — desktop/tablet only (mobile uses the navbar center +).
          Stacked ABOVE the AI coach launcher (which sits in the corner at b:24)
          and hidden while a modal is open so neither covers it. */}
      {!isMobile && !anyDialogOpen && (
        <div className="fixed z-[45] flex flex-col items-end gap-2" style={{ right: 24, bottom: 92 }}>
          {dialOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 fade-in">
              {dialActions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="flex items-center gap-2.5 h-10 pl-3 pr-4 rounded-full bg-[var(--panel)] border border-[var(--line)] shadow-[var(--shadow-md)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-2)] transition-colors text-[13px] font-medium"
                >
                  <span className="text-[var(--accent)]">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setDialOpen(v => !v)}
            aria-label="Acciones rápidas"
            aria-expanded={dialOpen}
            className={cn(
              "w-14 h-14 rounded-full shadow-[var(--shadow-lg)] flex items-center justify-center",
              "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-transform",
              dialOpen && "rotate-45",
            )}
          >
            {dialOpen ? <X size={24} /> : <Plus size={24} />}
          </button>
        </div>
      )}

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
