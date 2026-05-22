"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { mockMarkets } from "@/mock-data"
import type { Market, MarketCategory } from "@/types"

const CAT_LABELS: Record<MarketCategory, string> = {
  FUTUROS:  "Futuros",
  FX:       "FX / Forex",
  CRIPTO:   "Cripto",
  EQUITIES: "Equities",
}

const CAT_COLOR: Record<MarketCategory, string> = {
  FUTUROS:  "var(--accent)",
  FX:       "var(--win)",
  CRIPTO:   "#f59e0b",
  EQUITIES: "#8b5cf6",
}

const SESSION_COLORS: Record<string, string> = {
  "NY AM":  "var(--accent-soft)",
  "NY PM":  "var(--accent-soft)",
  "London": "var(--win-soft)",
  "Asia":   "var(--be-soft)",
  "24h":    "var(--chip)",
}

function SessionChip({ s }: { s: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
      background: SESSION_COLORS[s] ?? "var(--chip)",
      color: "var(--ink-2)",
    }}>{s}</span>
  )
}

function MarketCard({ market, onToggleWatch }: { market: Market; onToggleWatch: (s: string) => void }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: CAT_COLOR[market.category] + "22",
            color: CAT_COLOR[market.category],
            display: "grid", placeItems: "center",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700,
          }}>
            {market.symbol.slice(0,3)}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{market.symbol}</p>
            <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{market.name}</p>
          </div>
        </div>
        <button onClick={() => onToggleWatch(market.symbol)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: market.isWatchlisted ? "#f59e0b" : "var(--line-2)",
          padding: 4,
        }}>
          <Star size={16} fill={market.isWatchlisted ? "#f59e0b" : "none"} />
        </button>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45 }}>{market.description}</p>

      {/* Specs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { l: "Exchange", v: market.exchange },
          { l: "Tick size", v: market.tickSize },
          { l: "Point value", v: market.pointValue },
          { l: "Divisa", v: market.currency },
        ].map(f => (
          <div key={f.l}>
            <p style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)" }}>{f.l}</p>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginTop: 1 }}>{f.v}</p>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {market.sessions.map(s => <SessionChip key={s} s={s} />)}
      </div>
    </div>
  )
}

const CATS: ("todas" | MarketCategory)[] = ["todas", "FUTUROS", "FX", "CRIPTO", "EQUITIES"]

export default function MercadosPage() {
  const [markets, setMarkets] = useState<Market[]>(mockMarkets)
  const [cat, setCat]     = useState<"todas" | MarketCategory>("todas")
  const [onlyWatch, setOnlyWatch] = useState(false)

  const toggleWatch = (symbol: string) =>
    setMarkets(prev => prev.map(m => m.symbol === symbol ? { ...m, isWatchlisted: !m.isWatchlisted } : m))

  const visible = markets
    .filter(m => cat === "todas" || m.category === cat)
    .filter(m => !onlyWatch || m.isWatchlisted)

  const watchCount = markets.filter(m => m.isWatchlisted).length

  return (
    <div className="main-content">
      <TopBar
        title="Mercados"
        subtitle={`${markets.length} instrumentos · ${watchCount} en watchlist`}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)",
              background: cat === c ? "var(--ink)" : "var(--chip)",
              color: cat === c ? "var(--bg)" : "var(--ink-2)",
              fontSize: 12.5, fontWeight: cat === c ? 600 : 400,
              border: "1px solid var(--line)", cursor: "pointer",
            }}>
              {c === "todas" ? "Todos" : CAT_LABELS[c]}
            </button>
          ))}
        </div>
        <button onClick={() => setOnlyWatch(v => !v)} style={{
          height: 32, padding: "0 12px", borderRadius: "var(--radius-sm)",
          background: onlyWatch ? "#f59e0b22" : "var(--chip)",
          color: onlyWatch ? "#f59e0b" : "var(--ink-3)",
          border: `1px solid ${onlyWatch ? "#f59e0b" : "var(--line)"}`,
          fontSize: 12.5, fontWeight: onlyWatch ? 600 : 400,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        }}>
          <Star size={12} fill={onlyWatch ? "#f59e0b" : "none"} /> Watchlist
        </button>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--ink-3)", fontSize: 13 }}>
          Sin instrumentos en watchlist. Haz clic en ★ para agregar.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {visible.map(m => (
            <MarketCard key={m.symbol} market={m} onToggleWatch={toggleWatch} />
          ))}
        </div>
      )}
    </div>
  )
}
