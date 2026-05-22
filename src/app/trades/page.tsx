// Trades screen — spec: design-spec/trades.html
// Shell: Sidebar (layout) + main (TradesTable) + right rail (TradeDetailPanel)

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
      <div className="flex h-full">
        {/* Main */}
        <div className="flex-1 overflow-y-auto p-6">
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

        {/* Right rail — trade detail */}
        {selected && (
          <div className="w-72 shrink-0 border-l border-[var(--line)]">
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
