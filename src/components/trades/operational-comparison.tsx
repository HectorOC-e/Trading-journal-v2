"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { MODE_LABELS, type OperationalMode } from "@/domains/trading/operational-mode"
import type { Period } from "@/app/dashboard/hooks/use-dashboard-stats"

type ComparisonRow = {mode:OperationalMode;pnl:number;trades:number;winRate:number;avgR:number;currency:string}
export function OperationalComparisonTable({rows}:{rows:ComparisonRow[]}) {
  return <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
    <table className="w-full text-left text-xs">
      <caption className="p-3 text-left text-[var(--ink-3)]">Muestras independientes · resultados por fecha de operación</caption>
      <thead><tr>{["Modalidad","Operaciones","P&L operativo","Win rate","R medio"].map(label=><th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.mode} className="border-t border-[var(--line)]">
        <th scope="row" className="p-3">{MODE_LABELS[row.mode]}</th><td className="p-3">{row.trades}</td>
        <td className="p-3 num">{new Intl.NumberFormat("es-HN",{style:"currency",currency:row.currency}).format(row.pnl)}</td>
        <td className="p-3 num">{row.trades?`${row.winRate.toFixed(1)}%`:"—"}</td><td className="p-3 num">{row.trades?`${row.avgR.toFixed(2)}R`:"—"}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

function ComparisonData({period}:{period:Period}) {
  const real=trpc.trades.dashboardStats.useQuery({period,mode:"REAL"},{staleTime:60_000})
  const demo=trpc.trades.dashboardStats.useQuery({period,mode:"DEMO"},{staleTime:60_000})
  const backtest=trpc.trades.dashboardStats.useQuery({period,mode:"BACKTEST"},{staleTime:60_000})
  const queries=[real,demo,backtest]
  if(queries.some(query=>query.isLoading))return <p className="text-xs text-[var(--ink-3)]" role="status">Cargando las tres muestras…</p>
  if(queries.some(query=>query.isError||!query.data))return <p role="alert" className="text-xs text-[var(--loss)]">No se pudo completar la comparación.</p>
  const rows=queries.flatMap(query=>query.data?[{mode:query.data.scope.mode,pnl:query.data.kpis.netPnl,trades:query.data.kpis.total,winRate:query.data.kpis.winRate,avgR:query.data.kpis.avgR,currency:query.data.baseCurrency}]:[])
  return <OperationalComparisonTable rows={rows} />
}

export function OperationalComparison({period}:{period:Period}) {
  const [open,setOpen]=useState(false)
  return <section className="mb-5 space-y-3" aria-label="Comparación de modalidades">
    <Button variant="subtle" onClick={()=>setOpen(value=>!value)} aria-expanded={open}>{open?"Cerrar comparación":"Comparar modalidades"}</Button>
    {open?<ComparisonData period={period} />:null}
  </section>
}
