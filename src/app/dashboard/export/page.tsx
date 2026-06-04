"use client"

import { useEffect } from "react"
import { trpc } from "@/lib/trpc/client"

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 6, minWidth: 120 }}>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: color ?? "#0f172a" }}>{value}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", borderBottom: "2px solid #4f6ef7", paddingBottom: 6, marginBottom: 16, marginTop: 32 }}>
      {children}
    </h2>
  )
}

export default function ExportPage() {
  const { data: stats, isLoading } = trpc.trades.dashboardStats.useQuery({ period: "ALL" })
  const { data: accounts = []    } = trpc.accounts.list.useQuery()
  const { data: profile          } = trpc.profile.get.useQuery()

  useEffect(() => {
    if (!isLoading && stats) {
      setTimeout(() => window.print(), 500)
    }
  }, [isLoading, stats])

  if (isLoading || !stats) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#64748b" }}>
        Preparando reporte…
      </div>
    )
  }

  const { kpis, accountStats, setupStats, recentTrades } = stats
  const pf = kpis.profitFactor
  const now = new Date().toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 40px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", background: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Reporte de Performance</h1>
          <p style={{ fontSize: 12, color: "#64748b" }}>Generado el {now} · Período: Todo el historial</p>
          {profile && (
            <p style={{ fontSize: 12, color: "#64748b" }}>{profile.name ?? profile.email}</p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ width: 40, height: 40, background: "#4f6ef7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,17 8,12 12,14 17,7 21,9" />
            </svg>
          </div>
          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Trading Journal</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <SectionTitle>Métricas Globales</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <Kpi label="Net P&L" value={`${kpis.netPnl >= 0 ? "+" : "-"}$${Math.abs(kpis.netPnl).toFixed(2)}`} color={kpis.netPnl >= 0 ? "#22c55e" : "#e05555"} />
        <Kpi label="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} color={kpis.winRate >= 50 ? "#22c55e" : "#e05555"} />
        <Kpi label="Total Trades" value={String(kpis.total)} />
        <Kpi label="Avg R" value={`${kpis.avgR >= 0 ? "+" : ""}${kpis.avgR.toFixed(3)}R`} color={kpis.avgR >= 0 ? "#22c55e" : "#e05555"} />
        <Kpi label="Profit Factor" value={pf === 999 ? "∞" : pf.toFixed(3)} color={pf >= 1.5 ? "#22c55e" : pf >= 1 ? "#f59e0b" : "#e05555"} />
        <Kpi label="Sharpe" value={kpis.sharpeRatio != null ? kpis.sharpeRatio.toFixed(3) : "—"} color={kpis.sharpeRatio != null && kpis.sharpeRatio >= 1 ? "#22c55e" : undefined} />
        <Kpi label="Expectancy $" value={`${kpis.expectancyDollar >= 0 ? "+" : "-"}$${Math.abs(kpis.expectancyDollar).toFixed(2)}`} color={kpis.expectancyDollar >= 0 ? "#22c55e" : "#e05555"} />
      </div>

      {/* Account Breakdown */}
      {accountStats.length > 0 && (
        <>
          <SectionTitle>Cuentas</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Cuenta", "Balance", "P&L mes", "Win %", "Drawdown", "Estado"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accountStats.map(s => {
                const a = accounts.find(ac => ac.id === s.accountId)
                return (
                  <tr key={s.accountId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{a?.name ?? s.accountId}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>${s.balance.toFixed(2)}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.pnlMonth >= 0 ? "#22c55e" : "#e05555" }}>
                      {s.pnlMonth >= 0 ? "+" : "-"}${Math.abs(s.pnlMonth).toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{s.winRate.toFixed(1)}%</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.drawdownPct > 0 ? "#e05555" : "#94a3b8" }}>
                      {s.drawdownPct > 0 ? `-${s.drawdownPct.toFixed(1)}%` : "0.0%"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: a?.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                        color: a?.status === "ACTIVE" ? "#16a34a" : "#94a3b8",
                      }}>
                        {a?.status === "ACTIVE" ? "Activa" : a?.status ?? "—"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Setup Performance */}
      {setupStats && setupStats.length > 0 && (
        <>
          <SectionTitle>Performance por Setup</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Setup", "Trades", "Win %", "Avg R", "Cum R", "Net P&L"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setupStats.slice(0, 10).map(s => (
                <tr key={s.setupId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ background: s.color, color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{s.abbr}</span>
                    <span style={{ marginLeft: 8, color: "#475569" }}>{s.name}</span>
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{s.trades}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.winRate >= 50 ? "#22c55e" : "#e05555" }}>{s.winRate.toFixed(1)}%</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.avgR >= 0 ? "#22c55e" : "#e05555" }}>{s.avgR >= 0 ? "+" : ""}{s.avgR.toFixed(3)}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.cumR >= 0 ? "#22c55e" : "#e05555" }}>{s.cumR >= 0 ? "+" : ""}{s.cumR.toFixed(1)}R</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: s.netPnl >= 0 ? "#22c55e" : "#e05555" }}>{s.netPnl >= 0 ? "+" : "-"}${Math.abs(s.netPnl).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Recent Trades (last 20) */}
      {recentTrades.length > 0 && (
        <>
          <SectionTitle>Últimas Operaciones</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Fecha", "Símbolo", "Dir", "Setup", "P&L", "R"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTrades.slice(0, 20).map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", color: "#475569" }}>{t.date}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 600, fontFamily: "monospace" }}>{t.symbol}</td>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: t.direction === "LONG" ? "#22c55e" : "#e05555" }}>{t.direction}</span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>{t.setupAbbr ?? "—"}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", color: (t.pnl ?? 0) >= 0 ? "#22c55e" : "#e05555", fontWeight: 600 }}>
                    {t.pnl != null ? `${t.pnl >= 0 ? "+" : "-"}$${Math.abs(t.pnl).toFixed(2)}` : "—"}
                  </td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", color: (t.rMultiple ?? 0) >= 0 ? "#22c55e" : "#e05555" }}>
                    {t.rMultiple != null ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(2)}R` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 10, color: "#94a3b8" }}>Trading Journal v2 · Reporte generado automáticamente</p>
        <p style={{ fontSize: 10, color: "#94a3b8" }}>{now}</p>
      </div>

      <style>{`
        @media print {
          @page { margin: 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
