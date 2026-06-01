export const TYPE_META: Record<string, { color: string; label: string; icon: string }> = {
  PROP_FIRM:      { color: "#4f6ef7", label: "PROP FIRM",  icon: "🏢" },
  PERSONAL:       { color: "#22c55e", label: "PERSONAL",   icon: "👤" },
  DEMO_PROP:      { color: "#9b59b6", label: "DEMO PROP",  icon: "🖥️" },
  DEMO_PERSONAL:  { color: "#a78bfa", label: "DEMO",       icon: "🖥️" },
  BACKTEST:       { color: "#f59e0b", label: "BACKTEST",   icon: "📊" },
  QA:             { color: "#6b7280", label: "QA",         icon: "🔬" },
}

export const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

export function fmtDate(iso: string) {
  const [, m, d] = iso.split("-")
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]}`
}
