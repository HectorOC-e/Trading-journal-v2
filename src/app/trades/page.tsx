"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { TradesTable } from "@/components/trades/trades-table"
import { TradeDetailPanel } from "@/components/trades/trade-detail-panel"
import { RegisterTradeModal } from "@/components/trades/register-trade-modal"
import { mockTrades } from "@/mock-data"
import type { Trade } from "@/types"

const KPI_ITEMS = [
  { label: "Net P&L",   value: "+$3,540", sub: "este mes",    trend: "up"      as const, mono: true },
  { label: "Win Rate",  value: "65%",     sub: "23 trades",   trend: "up"      as const, mono: true },
  { label: "Avg R",     value: "+1.8R",   sub: "ganadores",   trend: "up"      as const, mono: true },
  { label: "Drawdown",  value: "-2.1%",   sub: "máx. diario", trend: "neutral" as const, mono: true },
]

export default function TradesPage() {
  const [selected, setSelected]   = useState<Trade | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      {/* -mx-8 -my-7 breaks out of main-content padding so the rail can go full height */}
      <div className="flex" style={{ margin: "-28px -32px", minHeight: "100vh" }}>
        {/* Main column */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "28px 32px" }}>
          <TopBar
            title="Trades"
            subtitle={`${mockTrades.length} operaciones este mes`}
            actions={[{
              label: "Registrar trade",
              icon: <Plus size={14} />,
              variant: "primary",
              onClick: () => setModalOpen(true),
            }]}
          />
          <KpiStrip items={KPI_ITEMS} className="mb-6" />
          <TradesTable
            trades={mockTrades}
            selectedId={selected?.id}
            onSelect={setSelected}
          />
        </div>

        {/* Right rail — 340px per spec */}
        {selected && (
          <div style={{ width: 340, flexShrink: 0, borderLeft: "1px solid var(--line)", background: "var(--panel)", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
            <TradeDetailPanel
              trade={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <RegisterTradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tradeCountToday={mockTrades.filter(t => t.date === new Date().toISOString().slice(0, 10)).length}
      />
    </>
  )
}
