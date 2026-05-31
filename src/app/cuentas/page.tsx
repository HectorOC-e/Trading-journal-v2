"use client"

import { useState } from "react"
import {
  Plus, TrendingUp,
  Shield, CheckCircle2, BarChart3,
  Loader2,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { AccountCard, KpiBox } from "./components/account-card"
import type { TradeStats } from "./components/account-card"
import { AccountDetailPanel } from "./components/account-detail-panel"
import { NuevaCuentaModal } from "./modals/create-account-modal"
import { EditarCuentaModal } from "./modals/edit-account-modal"
import { AccountHistoryModal } from "./modals/account-history-modal"
import { PromotePhaseModal } from "./modals/promote-phase-modal"
import { SyncBalanceModal } from "./modals/sync-balance-modal"

export default function CuentasPage() {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [historyId,  setHistoryId]  = useState<string | null>(null)
  const [promoteId,  setPromoteId]  = useState<string | null>(null)
  const [syncId,     setSyncId]     = useState<string | null>(null)

  const { data: accounts = [], isLoading } = trpc.accounts.list.useQuery()
  const { data: markets = [] }             = trpc.markets.list.useQuery()
  const { data: dashStats }                = trpc.trades.dashboardStats.useQuery({ period: "ALL" }, { staleTime: 60_000 })
  const utils = trpc.useUtils()

  // Build accountStats from server-side aggregation (all trades, not just paginated)
  const accountStats: Record<string, TradeStats> = Object.fromEntries(
    (dashStats?.accountStats ?? []).map(s => [s.accountId, {
      netPnl:      s.netPnl,
      pnlMonth:    s.pnlMonth,
      pnlToday:    s.pnlToday,
      winRate:     s.winRate,
      avgR:        s.avgR,
      tradesMonth: s.tradesMonth,
      tradesToday: s.tradesToday,
      tradesTotal: s.tradesTotal,
      drawdownPct: s.drawdownPct,
      sparkline:   s.sparkline,
    }]),
  )

  const invalidate = () => utils.accounts.list.invalidate()

  const deleteAccount  = trpc.accounts.delete.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const archiveAccount = trpc.accounts.archive.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const changeStatus   = trpc.accounts.changeStatus.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const changePhase    = trpc.accounts.changePhase.useMutation({ onSuccess: () => { invalidate() } })

  const selected       = accounts.find(a => a.id === selectedId) ?? null
  const historyAccount = accounts.find(a => a.id === historyId) ?? null
  const promoteAccount = accounts.find(a => a.id === promoteId) ?? null

  const totalBal    = accounts.reduce((s, a) => s + Number(a.initialBalance), 0)
  const activeCount = accounts.filter(a => a.status === "ACTIVE").length
  const totalPnlMonth  = Object.values(accountStats).reduce((s, v) => s + v.pnlMonth, 0)
  const totalTradesAll = Object.values(accountStats).reduce((s, v) => s + v.tradesTotal, 0)
  const pnlStr = `${totalPnlMonth >= 0 ? "+" : "-"}$${Math.abs(totalPnlMonth).toFixed(2)}`

  return (
    <>
      <div>
        <TopBar
          title="Cuentas"
          subtitle={`${accounts.length} cuentas`}
          actions={[{ label: "Nueva cuenta", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiBox label="Balance total"  value={`$${totalBal.toLocaleString()}`}
            sub={`${accounts.length} cuentas`}
            icon={<BarChart3 size={15} className="text-[var(--ink-3)]" />} />
          <KpiBox label="P&L este mes" value={totalTradesAll > 0 ? pnlStr : "— sin trades"}
            positive={totalTradesAll > 0 ? totalPnlMonth >= 0 : undefined}
            sub={totalTradesAll > 0 ? `${Object.values(accountStats).reduce((s, v) => s + v.tradesMonth, 0)} trades este mes` : "sin trades cerrados"}
            icon={<TrendingUp size={15} className="text-[var(--ink-3)]" />} />
          <KpiBox label="Total trades" value={String(totalTradesAll)}
            sub="trades cerrados"
            icon={<Shield size={15} className="text-[var(--ink-3)]" />} />
          <KpiBox label="Cuentas activas" value={String(activeCount)}
            sub={`de ${accounts.length} total`}
            icon={<CheckCircle2 size={15} className="text-[var(--ink-3)]" />} />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[var(--ink-3)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando cuentas…</span>
          </div>
        )}

        {!isLoading && accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--panel-2)] flex items-center justify-center">
              <BarChart3 size={20} className="text-[var(--ink-3)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">Sin cuentas aún</p>
              <p className="text-sm text-[var(--ink-3)] mt-1">Crea tu primera cuenta para empezar a registrar trades.</p>
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Nueva cuenta
            </Button>
          </div>
        )}

        {!isLoading && accounts.length > 0 && (
          <div className="flex gap-4 items-start">
            <div className={cn("grid gap-4 flex-1", selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
              {accounts.map(a => (
                <AccountCard
                  key={a.id}
                  rawAccount={a}
                  selected={selectedId === a.id}
                  onClick={() => setSelectedId(s => s === a.id ? null : a.id)}
                  stats={accountStats[a.id]}
                  onSyncBalance={(e) => { e.stopPropagation(); setSyncId(a.id) }}
                />
              ))}
            </div>

            {selected && (
              <div style={{
                width: 340, flexShrink: 0,
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                position: "sticky", top: 0,
                maxHeight: "calc(100vh - 28px)",
                overflowY: "auto",
              }}>
                <AccountDetailPanel
                  account={selected}
                  onClose={() => setSelectedId(null)}
                  onEdit={() => setEditingId(selected.id)}
                  onDelete={() => deleteAccount.mutate(selected.id)}
                  deleting={deleteAccount.isPending}
                  onArchive={() => archiveAccount.mutate(selected.id)}
                  archiving={archiveAccount.isPending}
                  onLost={(note) => changeStatus.mutate({ id: selected.id, status: "LOST", statusNote: note })}
                  onOpenHistory={() => setHistoryId(selected.id)}
                  onPromotePhase={() => setPromoteId(selected.id)}
                  stats={accountStats[selected.id]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <NuevaCuentaModal open={modalOpen} onOpenChange={setModalOpen} markets={markets as never} />

      {editingId && (() => {
        const ea = accounts.find(a => a.id === editingId)
        return ea ? (
          <EditarCuentaModal open onOpenChange={(v) => { if (!v) setEditingId(null) }} account={ea} markets={markets as never} />
        ) : null
      })()}

      {historyId && historyAccount && (
        <AccountHistoryModal
          accountId={historyId}
          accountName={historyAccount.name}
          onClose={() => setHistoryId(null)}
        />
      )}

      {promoteId && promoteAccount && (
        <PromotePhaseModal
          account={promoteAccount}
          onClose={() => setPromoteId(null)}
          onConfirm={(input) => changePhase.mutate(input)}
          saving={changePhase.isPending}
          markets={markets as never}
        />
      )}

      {syncId && (() => {
        const syncAccount = accounts.find(a => a.id === syncId)
        return syncAccount ? (
          <SyncBalanceModal
            accountId={syncId}
            accountName={syncAccount.name}
            onClose={() => setSyncId(null)}
          />
        ) : null
      })()}
    </>
  )
}
