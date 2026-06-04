"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Plus, TrendingUp, Percent, Zap, Activity, Upload, AlertTriangle } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { SkeletonTableRows } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { TradesTable } from "@/components/trades/trades-table"
import { TradeDetailPanel } from "@/components/trades/trade-detail-panel"
import { RegisterTradeModal } from "@/components/trades/register-trade-modal"
import { EditTradeModal } from "@/components/trades/edit-trade-modal"
import { PositionLogModal } from "@/components/trades/position-log-modal"
import { LogSessionPopover } from "@/components/trades/log-session-popover"
import { ImportCsvModal } from "./components/import-csv-modal"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"
import type { Trade, Account, Setup } from "@/types"

type MarketItem = RouterOutputs["markets"]["list"][number]

export default function TradesPage() {
  const [selectedId, setSelectedId]  = useState<string | null>(null)
  const [modalOpen, setModalOpen]    = useState(false)
  const [editingTrade, setEditingTrade]         = useState<string | null>(null)
  const [positionLogTrade, setPositionLogTrade] = useState<string | null>(null)
  const [propFirmError, setPropFirmError]       = useState<string | null>(null)
  const [deactivatedAccount, setDeactivatedAccount] = useState<string | null>(null)
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false)
  const [importModalOpen, setImportModalOpen]       = useState(false)

  const pendingChecklistRef = useRef<{ setupId?: string; items: string[]; total: number } | null>(null)

  const utils = trpc.useUtils()

  // ── Data ──────────────────────────────────────────────
  const {
    data: tradePages,
    isLoading: tradesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.trades.list.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  )
  const trades = tradePages?.pages.flatMap(p => p.items) ?? []

  const { data: accounts = [] } =
    trpc.accounts.list.useQuery()

  const { data: setups = [] } =
    trpc.setups.list.useQuery()

  const { data: markets = [] } =
    trpc.markets.list.useQuery()

  const { data: customTagsRaw = [] } =
    trpc.tradeTags.list.useQuery()

  // Exclude system tags — custom tags are user-created
  const SYSTEM_TAGS = new Set(["A+", "Plan", "Off-plan", "Impulsivo", "Revanche"])
  const customTags = customTagsRaw
    .map(t => t.tag)
    .filter(t => !SYSTEM_TAGS.has(t))

  const PROP_FIRM_MESSAGES: Record<string, string> = {
    PROP_FIRM_DAILY_LOSS_LIMIT:   "Has alcanzado el límite de pérdida diaria para esta cuenta.",
    PROP_FIRM_MAX_TRADES:         "Has alcanzado el máximo de trades diarios para esta cuenta.",
    PROP_FIRM_SYMBOL_NOT_ALLOWED: "Este símbolo no está permitido en esta cuenta.",
  }

  const saveChecklist = trpc.trades.saveChecklistResult.useMutation({
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const createTrade = trpc.trades.create.useMutation({
    onSuccess: (trade) => {
      utils.trades.list.invalidate()
      const pc = pendingChecklistRef.current
      if (pc && pc.total > 0) {
        saveChecklist.mutate({ tradeId: trade.id, setupId: pc.setupId, itemsChecked: pc.items, itemsTotal: pc.total })
        pendingChecklistRef.current = null
      }
    },
    onError: (err) => {
      const msg = PROP_FIRM_MESSAGES[err.message]
      if (msg) setPropFirmError(msg)
      else toast.error(formatErrorForUser(err))
    },
  })

  const deleteTrade = trpc.trades.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null)
      utils.trades.list.invalidate()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const updateTrade = trpc.trades.update.useMutation({
    onSuccess: () => {
      setEditingTrade(null)
      utils.trades.list.invalidate()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const closeTrade = trpc.trades.close.useMutation({
    onSuccess: (result) => {
      utils.trades.list.invalidate()
      utils.accounts.list.invalidate()
      if (result.accountDeactivated) {
        const acct = accounts.find(a => a.id === result.trade.accountId)
        setDeactivatedAccount(acct?.name ?? "tu cuenta")
      }
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const addEvent = trpc.trades.addEvent.useMutation({
    onSuccess: () => utils.trades.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  // ── Derived state ──────────────────────────────────────
  const selected = useMemo(
    () => trades.find(t => t.id === selectedId) ?? null,
    [trades, selectedId]
  )

  const editTarget = useMemo(
    () => trades.find(t => t.id === editingTrade) ?? null,
    [trades, editingTrade]
  )

  const posLogTarget = useMemo(
    () => trades.find(t => t.id === positionLogTrade) ?? null,
    [trades, positionLogTrade]
  )

  const todayStr = new Date().toISOString().slice(0, 10)
  const tradeCountToday = trades.filter(t => t.date === todayStr).length

  // KPIs from server-side aggregation (all trades, not just loaded page)
  const { data: statsData } = trpc.trades.dashboardStats.useQuery(
    { period: "ALL" },
    { staleTime: 60_000 },
  )
  const kpisAll = statsData?.kpis
  const netPnl  = kpisAll?.netPnl  ?? 0
  const wins    = kpisAll?.wins    ?? 0
  const wr      = kpisAll ? Math.round(kpisAll.winRate) : 0
  const avgR    = kpisAll?.avgR    ?? 0
  const totalCount = kpisAll?.total ?? trades.length

  const kpiItems = [
    {
      label: "Net P&L",
      value: netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`,
      sub: `${totalCount} trades`,
      trend: netPnl >= 0 ? "up" as const : "down" as const,
      mono: true,
      icon: <TrendingUp size={15} />,
    },
    {
      label: "Win Rate",
      value: `${wr}%`,
      sub: `${wins} ganados`,
      trend: wr >= 50 ? "up" as const : "neutral" as const,
      mono: true,
      icon: <Percent size={15} />,
    },
    {
      label: "Avg R",
      value: `${avgR >= 0 ? "+" : ""}${avgR.toFixed(1)}R`,
      sub: "por trade",
      trend: avgR >= 0 ? "up" as const : "down" as const,
      mono: true,
      icon: <Zap size={15} />,
    },
    {
      label: "Sharpe",
      value: kpisAll?.sharpeRatio != null ? kpisAll.sharpeRatio.toFixed(2) : "—",
      sub: "consistencia",
      trend: (kpisAll?.sharpeRatio ?? 0) >= 1 ? "up" as const : "neutral" as const,
      mono: true,
      icon: <Activity size={15} />,
    },
    {
      label: "Peor día",
      value: kpisAll?.worstDay && kpisAll.worstDay.pnl < 0 ? `-$${Math.abs(kpisAll.worstDay.pnl).toLocaleString()}` : "—",
      sub: kpisAll?.worstDay && kpisAll.worstDay.pnl < 0 ? kpisAll.worstDay.date : "sin datos",
      trend: "down" as const,
      mono: true,
      icon: <AlertTriangle size={15} />,
    },
  ]

  // ── Handlers ──────────────────────────────────────────
  const handleModalSubmit = (form: {
    accountId: string; setupId: string; direction: "LONG" | "SHORT"
    symbol: string; entry: string; stop: string; target: string; size: string
    date: string; openTime: string; session: "London" | "New York" | "Asia" | "London Close"
    tags: string[]; notes: string; screenshots: string[]
    checklistItems: Record<string, boolean>
    emotionBefore: "calm" | "anxious" | "excited" | "fearful" | "overconfident" | null
    confidenceRating: number | null
    executionQuality: number | null
    fomoFlag: boolean
    revengeFlag: boolean
  }) => {
    // Capture checklist before mutation fires
    const setup = setups.find(s => s.id === form.setupId)
    if (setup) {
      const allItems = [...(setup as { aplusChecklist: string[] }).aplusChecklist, ...(setup as { standardChecklist: string[] }).standardChecklist]
      const checked  = allItems.filter(item => form.checklistItems[item])
      pendingChecklistRef.current = { setupId: form.setupId || undefined, items: checked, total: allItems.length }
    } else {
      pendingChecklistRef.current = null
    }

    const entry  = parseFloat(form.entry)
    const stop   = parseFloat(form.stop)
    const target = parseFloat(form.target)
    const size   = parseFloat(form.size)

    createTrade.mutate({
      accountId:        form.accountId,
      setupId:          form.setupId || undefined,
      direction:        form.direction,
      symbol:           form.symbol.toUpperCase(),
      entry,
      stop,
      target,
      size,
      date:             form.date,
      openTime:         form.openTime,
      session:          form.session,
      tags:             form.tags,
      notes:            form.notes,
      screenshotUrls:   form.screenshots,
      emotionBefore:    form.emotionBefore ?? undefined,
      confidenceRating: form.confidenceRating,
      executionQuality: form.executionQuality,
      fomoFlag:         form.fomoFlag,
      revengeFlag:      form.revengeFlag,
    })
  }

  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [!!selected])

  const detailPanel = selected ? (
    <TradeDetailPanel
      trade={selected}
      account={selected.account ?? undefined}
      setup={selected.setup ?? undefined}
      onClose={() => setSelectedId(null)}
      onDelete={() => deleteTrade.mutate(selected.id)}
      deleting={deleteTrade.isPending}
      onEdit={() => setEditingTrade(selected.id)}
      onPositionLog={() => setPositionLogTrade(selected.id)}
      onCloseTrade={(data) => closeTrade.mutate({ id: selected.id, ...data })}
      closingTrade={closeTrade.isPending}
    />
  ) : null

  // ── Render ────────────────────────────────────────────
  return (
    <>
      {/* Prop firm error banner */}
      {propFirmError && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--loss-soft)] border border-[var(--loss)] px-4 py-3 text-sm text-[var(--loss)]">
          <span className="flex-1">{propFirmError}</span>
          <button onClick={() => setPropFirmError(null)} className="text-[var(--loss)] opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {/* Account auto-deactivated banner */}
      {deactivatedAccount && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--loss-soft)] border border-[var(--loss)] px-4 py-3 text-sm text-[var(--loss)]">
          <span className="flex-1">
            La cuenta <strong>{deactivatedAccount}</strong> ha sido desactivada automáticamente por superar el drawdown total máximo.
          </span>
          <button onClick={() => setDeactivatedAccount(null)} className="text-[var(--loss)] opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="flex" style={{ margin: "-28px -32px", minHeight: "100vh" }}>
        {/* Main column */}
        <div className="flex-1" style={{ padding: "28px 32px", minWidth: 0 }}>
          <TopBar
            title="Trades"
            subtitle={tradesLoading ? "Cargando…" : `${trades.length} operaciones`}
            actions={[
              {
                label: "Log sesión",
                icon: <Activity size={14} />,
                variant: "ghost" as const,
                onClick: () => setSessionPopoverOpen(true),
              },
              {
                label: "Importar CSV",
                icon: <Upload size={14} />,
                variant: "ghost" as const,
                onClick: () => setImportModalOpen(true),
              },
              {
                label: "Registrar trade",
                icon: <Plus size={14} />,
                variant: "primary" as const,
                onClick: () => setModalOpen(true),
              },
            ]}
          />
          <KpiStrip items={kpiItems} className="mb-6" />
          {tradesLoading ? (
            <SkeletonTableRows rows={8} />
          ) : trades.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin trades registrados"
              subtitle="Registra tu primer trade o importa un historial CSV para comenzar."
              action={{ label: "Registrar trade", onClick: () => setModalOpen(true) }}
            />
          ) : (
            <TradesTable
              trades={trades}
              accounts={accounts}
              setups={setups}
              selectedId={selectedId ?? undefined}
              onSelect={(t) => setSelectedId(t ? t.id : null)}
            />
          )}
          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-4 py-2 text-sm font-medium text-[var(--ink-2)] border border-[var(--line)] rounded-[var(--radius-sm)] hover:text-[var(--ink)] hover:border-[var(--line-2)] transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>

        {/* Right rail — desktop only, lives inside layout */}
        {selected && (
          <div
            className="hidden md:block"
            style={{
              width: 340, flexShrink: 0,
              borderLeft: "1px solid var(--line)",
              background: "var(--panel)",
              position: "sticky", top: 0,
              height: "100vh", overflowY: "auto",
            }}
          >
            {detailPanel}
          </div>
        )}
      </div>

      {/* Mobile panel — rendered OUTSIDE the layout div so no overflow ancestor blocks iOS scroll */}
      {selected && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            top: 52, left: 0, right: 0, bottom: 56,
            zIndex: 40,
            overflowY: "scroll",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            background: "var(--panel)",
            borderTop: "1px solid var(--line)",
          }}
        >
          {detailPanel}
        </div>
      )}

      <RegisterTradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accounts={accounts}
        setups={setups}
        markets={markets}
        customTags={customTags}
        tradeCountToday={tradeCountToday}
        onSubmit={handleModalSubmit}
      />

      {editTarget && (
        <EditTradeModal
          open={!!editingTrade}
          onOpenChange={(v) => { if (!v) setEditingTrade(null) }}
          trade={editTarget}
          setups={setups}
          onSave={(data) => updateTrade.mutate({ id: editTarget.id, ...data })}
          saving={updateTrade.isPending}
        />
      )}

      {posLogTarget && (
        <PositionLogModal
          open={!!positionLogTrade}
          onOpenChange={(v) => { if (!v) setPositionLogTrade(null) }}
          trade={posLogTarget}
          account={posLogTarget.account}
          events={posLogTarget.events}
          onAddEvent={(data) => addEvent.mutate({ tradeId: posLogTarget.id, ...data })}
          adding={addEvent.isPending}
        />
      )}

      <LogSessionPopover
        open={sessionPopoverOpen}
        onOpenChange={setSessionPopoverOpen}
      />

      <ImportCsvModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </>
  )
}
