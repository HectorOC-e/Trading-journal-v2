"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, TrendingUp, Percent, Zap, Shield } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { TradesTable } from "@/components/trades/trades-table"
import { TradeDetailPanel } from "@/components/trades/trade-detail-panel"
import { RegisterTradeModal } from "@/components/trades/register-trade-modal"
import { EditTradeModal } from "@/components/trades/edit-trade-modal"
import { PositionLogModal } from "@/components/trades/position-log-modal"
import { trpc } from "@/lib/trpc/client"

export default function TradesPage() {
  const [selectedId, setSelectedId]  = useState<string | null>(null)
  const [modalOpen, setModalOpen]    = useState(false)
  const [editingTrade, setEditingTrade]         = useState<string | null>(null)
  const [positionLogTrade, setPositionLogTrade] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // ── Data ──────────────────────────────────────────────
  const { data: trades = [], isLoading: tradesLoading } =
    trpc.trades.list.useQuery()

  const { data: accounts = [] } =
    trpc.accounts.list.useQuery()

  const { data: setups = [] } =
    trpc.setups.list.useQuery()

  const { data: markets = [] } =
    trpc.markets.list.useQuery()

  const createTrade = trpc.trades.create.useMutation({
    onSuccess: () => utils.trades.list.invalidate(),
  })

  const deleteTrade = trpc.trades.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null)
      utils.trades.list.invalidate()
    },
  })

  const updateTrade = trpc.trades.update.useMutation({
    onSuccess: () => {
      setEditingTrade(null)
      utils.trades.list.invalidate()
    },
  })

  const closeTrade = trpc.trades.close.useMutation({
    onSuccess: () => utils.trades.list.invalidate(),
  })

  const addEvent = trpc.trades.addEvent.useMutation({
    onSuccess: () => utils.trades.list.invalidate(),
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

  // KPIs from all loaded trades
  const netPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins   = trades.filter(t => (t.rMultiple ?? 0) > 0).length
  const wr     = trades.length ? Math.round((wins / trades.length) * 100) : 0
  const avgR   = trades.length
    ? trades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / trades.length
    : 0

  // Simple max daily drawdown approximation
  const dailyPnl = trades.reduce((map, t) => {
    const prev = map.get(t.date) ?? 0
    map.set(t.date, prev + (t.pnl ?? 0))
    return map
  }, new Map<string, number>())
  const minDay = Math.min(0, ...(Array.from(dailyPnl.values()) as number[]))

  const kpiItems = [
    {
      label: "Net P&L",
      value: netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`,
      sub: `${trades.length} trades`,
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
      label: "Drawdown",
      value: minDay < 0 ? `-$${Math.abs(minDay).toLocaleString()}` : "$0",
      sub: "peor día",
      trend: "neutral" as const,
      mono: true,
      icon: <Shield size={15} />,
    },
  ]

  // ── Handlers ──────────────────────────────────────────
  const handleModalSubmit = (form: {
    accountId: string; setupId: string; direction: "LONG" | "SHORT"
    symbol: string; entry: string; stop: string; target: string; size: string
    date: string; openTime: string; session: "London" | "New York" | "Asia" | "London Close"
    tags: string[]; notes: string; screenshots: string[]
  }) => {
    const entry  = parseFloat(form.entry)
    const stop   = parseFloat(form.stop)
    const target = parseFloat(form.target)
    const size   = parseFloat(form.size)

    createTrade.mutate({
      accountId:      form.accountId,
      setupId:        form.setupId || undefined,
      direction:      form.direction,
      symbol:         form.symbol.toUpperCase(),
      entry,
      stop,
      target,
      size,
      date:           form.date,
      openTime:       form.openTime,
      session:        form.session,
      tags:           form.tags,
      notes:          form.notes,
      screenshotUrls: form.screenshots,
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
      trade={selected as never}
      account={selected.account as never}
      setup={selected.setup as never}
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
      <div className="flex" style={{ margin: "-28px -32px", minHeight: "100vh" }}>
        {/* Main column */}
        <div className="flex-1" style={{ padding: "28px 32px", minWidth: 0 }}>
          <TopBar
            title="Trades"
            subtitle={tradesLoading ? "Cargando…" : `${trades.length} operaciones`}
            actions={[{
              label: "Registrar trade",
              icon: <Plus size={14} />,
              variant: "primary",
              onClick: () => setModalOpen(true),
            }]}
          />
          <KpiStrip items={kpiItems} className="mb-6" />
          <TradesTable
            trades={trades as never}
            accounts={accounts as never}
            setups={setups as never}
            selectedId={selectedId ?? undefined}
            onSelect={(t) => setSelectedId(t ? t.id : null)}
          />
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
            WebkitOverflowScrolling: "touch" as never,
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
        accounts={accounts as never}
        setups={setups as never}
        markets={markets as never}
        tradeCountToday={tradeCountToday}
        onSubmit={handleModalSubmit as never}
      />

      {editTarget && (
        <EditTradeModal
          open={!!editingTrade}
          onOpenChange={(v) => { if (!v) setEditingTrade(null) }}
          trade={editTarget as never}
          setups={setups as never}
          onSave={(data) => updateTrade.mutate({ id: editTarget.id, ...data } as never)}
          saving={updateTrade.isPending}
        />
      )}

      {posLogTarget && (
        <PositionLogModal
          open={!!positionLogTrade}
          onOpenChange={(v) => { if (!v) setPositionLogTrade(null) }}
          trade={posLogTarget as never}
          account={(posLogTarget as never as { account?: { initialBalance: number; ddDailyPct?: number | null; ddTotalPct?: number | null } }).account}
          events={(posLogTarget as never as { events?: { id: string; type: string; price: number | null; contracts: number | null; notes: string; timestamp: string }[] }).events ?? []}
          onAddEvent={(data) => addEvent.mutate({ tradeId: posLogTarget.id, ...data } as never)}
          adding={addEvent.isPending}
        />
      )}
    </>
  )
}
