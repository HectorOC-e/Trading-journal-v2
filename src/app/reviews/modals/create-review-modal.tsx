"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type AccountFromDB  = RouterOutputs["accounts"]["list"][number]
type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]
type TradeFromDB    = RouterOutputs["trades"]["list"]["items"][number]

const MONTH_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

function getISOWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const jan4 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

function formatWeekRange(start: Date, end: Date): string {
  const sm = MONTH_SHORT[start.getMonth()]
  const em = MONTH_SHORT[end.getMonth()]
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${sm}`
    : `${start.getDate()} ${sm}–${end.getDate()} ${em}`
}

function generateWeekOptions(n = 6) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - daysBack)
  thisMonday.setHours(0, 0, 0, 0)
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(thisMonday)
    start.setDate(thisMonday.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      label: `Sem. ${getISOWeekNumber(start)}`,
      range: formatWeekRange(start, end),
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
    }
  })
}

const WEEK_OPTIONS = generateWeekOptions(6)
type WeekOption = typeof WEEK_OPTIONS[number]

function disciplineColor(score: number): string {
  if (score >= 80) return "var(--win)"
  if (score >= 60) return "var(--be)"
  return "var(--loss)"
}

function disciplineBg(score: number): string {
  if (score >= 80) return "var(--win-soft)"
  if (score >= 60) return "var(--be-soft)"
  return "var(--loss-soft)"
}

function formatPnl(pnl: number): string {
  return pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${Math.abs(pnl).toLocaleString()}`
}

function DisciplineBar({ score }: { score: number }) {
  return (
    <div className="h-1 w-full rounded-full" style={{ background: "var(--line)" }}>
      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: disciplineColor(score) }} />
    </div>
  )
}

interface GeneratedReview {
  tradeCount: number; netPnl: number; winRate: number; disciplineScore: number
  executiveSummary: string; whatWorked: string; toImprove: string
}

function generateWeekReview(weekStart: string, weekEnd: string, accountId: string, trades: TradeFromDB[]): GeneratedReview {
  const filtered = trades.filter((t) => {
    const acctMatch = accountId === "ALL" || t.accountId === accountId
    return acctMatch && t.date >= weekStart && t.date <= weekEnd
  })

  if (filtered.length === 0) {
    return { tradeCount: 0, netPnl: 0, winRate: 0, disciplineScore: 0, executiveSummary: "No hay trades registrados para esta semana y cuenta.", whatWorked: "", toImprove: "" }
  }

  const netPnl  = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winners = filtered.filter((t) => (t.pnl ?? 0) > 0)
  const winRate = Math.round((winners.length / filtered.length) * 100)

  const disciplinedCount = filtered.filter((t) => t.tags.some((tag: string) => tag === "A+" || tag === "Plan")).length
  const offPlanCount     = filtered.filter((t) => t.tags.some((tag: string) => tag === "Off-plan" || tag === "Impulsivo")).length
  const disciplineScore  = filtered.length > 0 ? Math.round((disciplinedCount / filtered.length) * 100) : 0

  const pnlStr    = formatPnl(netPnl)
  const sentiment = disciplineScore >= 80 && winRate >= 60 ? "Excelente semana"
    : disciplineScore >= 60 && netPnl >= 0 ? "Semana positiva"
    : netPnl < 0 ? "Semana difícil"
    : "Semana regular"

  const execSummary = `${sentiment}. ${filtered.length} trades ejecutados con un resultado neto de ${pnlStr} (${winRate}% win rate). Score de disciplina: ${disciplineScore}/100. ${
    offPlanCount > 0
      ? `${offPlanCount} trade${offPlanCount > 1 ? "s" : ""} fuera del plan.`
      : "Todos los trades siguieron el plan."
  }`

  const aPlus = filtered.filter((t) => t.tags.includes("A+"))
  const winningTrades = filtered.filter((t) => (t.pnl ?? 0) > 0)
  const whatWorkedLines: string[] = []
  if (aPlus.length > 0) whatWorkedLines.push(`Trades A+ en ${[...new Set(aPlus.map((t) => t.symbol))].join(", ")} ejecutados con alta confluencia`)
  if (winningTrades.length > 0) whatWorkedLines.push(`Mejores resultados en sesión ${[...new Set(winningTrades.map((t) => t.session))].join(", ")}`)
  if (disciplinedCount === filtered.length) whatWorkedLines.push("100% de trades dentro del plan establecido")
  if (winRate >= 60) whatWorkedLines.push(`Win rate de ${winRate}% por encima del objetivo`)
  if (whatWorkedLines.length === 0) whatWorkedLines.push("—")

  const toImproveLines: string[] = []
  const offPlanTrades = filtered.filter((t) => t.tags.some((tag: string) => tag === "Off-plan" || tag === "Impulsivo"))
  if (offPlanTrades.length > 0) toImproveLines.push(`Revisar disciplina en ${[...new Set(offPlanTrades.map((t) => t.symbol))].join(", ")} — ${offPlanTrades.length} trade${offPlanTrades.length > 1 ? "s" : ""} fuera del plan`)
  if (winRate < 50) toImproveLines.push(`Mejorar selectividad — win rate de ${winRate}% por debajo del objetivo`)
  const losingTrades = filtered.filter((t) => (t.pnl ?? 0) < 0)
  if (losingTrades.length > 0) {
    const sessions = [...new Set(losingTrades.map((t) => t.session))]
    if (sessions.length > 0) toImproveLines.push(`Analizar trades perdedores en sesión ${sessions.join(", ")}`)
  }
  if (toImproveLines.length === 0) toImproveLines.push("Mantener consistencia la próxima semana")

  return {
    tradeCount: filtered.length, netPnl, winRate, disciplineScore,
    executiveSummary: execSummary,
    whatWorked: whatWorkedLines.map((l) => `• ${l}`).join("\n"),
    toImprove:  toImproveLines.map((l) => `• ${l}`).join("\n"),
  }
}

function WeekSelectorCard({ week, selected, onClick, generated }: {
  week: WeekOption; selected: boolean; onClick: () => void; generated?: GeneratedReview
}) {
  const pnlDisplay    = generated ? formatPnl(generated.netPnl) : "—"
  const wrDisplay     = generated ? `${generated.winRate}%` : "—"
  const tradesDisplay = generated ? generated.tradeCount : "—"
  const isLoss        = generated ? generated.netPnl < 0 : false

  return (
    <button
      onClick={onClick}
      className={cn("w-full text-left rounded-[var(--radius-sm)] border p-3 transition-all duration-100",
        selected ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]" : "border-[var(--line)] hover:border-[var(--accent)]"
      )}
      style={{ background: selected ? "var(--accent-soft)" : "var(--panel-2)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-sm" style={{ color: "var(--ink)" }}>{week.label}</span>
        {selected && <Check size={12} style={{ color: "var(--accent)" }} />}
      </div>
      <p className="text-[11px] mb-2" style={{ color: "var(--ink-3)" }}>{week.range}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>{tradesDisplay} trades</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ color: isLoss ? "var(--loss)" : "var(--win)", background: isLoss ? "var(--loss-soft)" : "var(--win-soft)" }}>{pnlDisplay}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>{wrDisplay} WR</span>
      </div>
    </button>
  )
}

function AccountSelectorCard({ account, selected, onClick }: { account: AccountFromDB; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("w-full text-left rounded-[var(--radius-sm)] border p-3 transition-all duration-100",
        selected ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]" : "border-[var(--line)] hover:border-[var(--accent)]"
      )}
      style={{ background: selected ? "var(--accent-soft)" : "var(--panel-2)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{account.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>{account.broker}</p>
        </div>
        {selected && <Check size={14} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  )
}

export function NuevaReviewModal({ open, onOpenChange, reviewResources }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reviewResources: ResourceFromDB[]
}) {
  const [step,              setStep]             = useState<"config" | "analisis">("config")
  const [selectedWeek,      setSelectedWeek]     = useState(0)
  const [generated,         setGenerated]        = useState<GeneratedReview | null>(null)
  const [autoFields,        setAutoFields]       = useState<Set<string>>(new Set())
  const [executiveSummary,  setExecutiveSummary] = useState("")
  const [whatWorked,        setWhatWorked]       = useState("")
  const [toImprove,         setToImprove]        = useState("")
  const [disciplineScore,   setDisciplineScore]  = useState(75)
  const [resourcesOpen,     setResourcesOpen]    = useState(false)
  const [linkedResources,   setLinkedResources]  = useState<string[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  const { data: accounts = [] } = trpc.accounts.list.useQuery()
  const { data: rawTrades } = trpc.trades.list.useQuery()
  const allTrades: TradeFromDB[] = rawTrades?.items ?? []
  const utils = trpc.useUtils()

  const effectiveAccountId = selectedAccountId || accounts[0]?.id || ""

  const createReview = trpc.weeklyReviews.create.useMutation({
    onSuccess: () => { utils.weeklyReviews.list.invalidate(); onOpenChange(false); resetState() },
  })

  function resetState() {
    setStep("config"); setSelectedWeek(0); setGenerated(null); setAutoFields(new Set())
    setExecutiveSummary(""); setWhatWorked(""); setToImprove(""); setDisciplineScore(75)
    setLinkedResources([]); setResourcesOpen(false)
  }

  const week = WEEK_OPTIONS[selectedWeek]

  const { data: serverScore } = trpc.weeklyReviews.computedDisciplineScore.useQuery(
    { weekStart: week.start, weekEnd: week.end },
  )

  // T-IX-004: Pre-fill query — loads trade stats for the selected week/account from the server
  const { data: prefillData } = trpc.weeklyReviews.prefill.useQuery(
    {
      weekStart: week.start,
      weekEnd:   week.end,
      ...(effectiveAccountId ? { accountId: effectiveAccountId } : {}),
    },
    { staleTime: 60_000 },
  )

  // When prefill data arrives and the summary fields have not been manually edited,
  // apply the server-computed stats so the modal opens with accurate trade data.
  useEffect(() => {
    if (!prefillData) return
    if (!generated) {
      // No manual generate yet — apply all auto fields
      setAutoFields(prev => new Set([...prev, "disciplineScore"]))
      setDisciplineScore(prefillData.disciplineScore)
    }
  }, [prefillData])

  useEffect(() => {
    if (serverScore && autoFields.has("disciplineScore")) {
      setDisciplineScore(serverScore.score)
    }
  }, [serverScore])

  function runAutoGenerate(weekIdx: number, accountId: string) {
    if (!accountId) return
    const w   = WEEK_OPTIONS[weekIdx]
    const gen = generateWeekReview(w.start, w.end, accountId, allTrades)
    setGenerated(gen)
    setExecutiveSummary(gen.executiveSummary)
    setWhatWorked(gen.whatWorked)
    setToImprove(gen.toImprove)
    setDisciplineScore(gen.disciplineScore)
    setAutoFields(new Set(["executiveSummary", "whatWorked", "toImprove", "disciplineScore"]))
  }

  function handleSelectWeek(idx: number) { setSelectedWeek(idx); runAutoGenerate(idx, effectiveAccountId) }
  function handleSelectAccount(id: string) { setSelectedAccountId(id); runAutoGenerate(selectedWeek, id) }

  function markEdited(field: string) {
    setAutoFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  function toggleResource(id: string) {
    setLinkedResources((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])
  }

  function handleSave(status: "draft" | "submitted") {
    if (!week) return
    // Prefer locally generated stats; fall back to server prefill; default to 0
    const tradeCount = generated?.tradeCount ?? prefillData?.tradeCount ?? 0
    const netPnl     = generated?.netPnl     ?? prefillData?.netPnl     ?? 0
    const winRate    = generated?.winRate     ?? prefillData?.winRate    ?? 0
    createReview.mutate({
      accountId: effectiveAccountId || null,
      weekLabel: week.label, weekRange: week.range, weekStart: week.start, weekEnd: week.end,
      tradeCount, netPnl, winRate, disciplineScore,
      executiveSummary, whatWorked, toImprove, status,
    })
  }

  const discColor = disciplineColor(disciplineScore)
  const discBg    = disciplineBg(disciplineScore)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva review semanal</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-[var(--radius-sm)] mx-0" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
          {(["config", "analisis"] as const).map((s) => (
            <button key={s} onClick={() => setStep(s)}
              className={cn("flex-1 text-xs font-semibold py-1.5 px-3 rounded transition-all duration-100", step === s ? "text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]")}
              style={step === s ? { background: "var(--panel)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : {}}>
              {s === "config" ? "1 · Configuración" : "2 · Análisis"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {step === "config" && (
            <div className="flex flex-col gap-5 py-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>Cuenta</p>
                <div className="grid grid-cols-1 gap-2">
                  {accounts.length === 0 ? (
                    <p className="text-xs text-[var(--ink-3)] italic py-2">Cargando cuentas…</p>
                  ) : (
                    accounts.map((acct: AccountFromDB) => (
                      <AccountSelectorCard key={acct.id} account={acct} selected={effectiveAccountId === acct.id} onClick={() => handleSelectAccount(acct.id)} />
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>Semana</p>
                <div className="grid grid-cols-2 gap-2">
                  {WEEK_OPTIONS.map((w, i) => (
                    <WeekSelectorCard key={w.label} week={w} selected={selectedWeek === i} onClick={() => handleSelectWeek(i)} generated={generated && selectedWeek === i ? generated : undefined} />
                  ))}
                </div>
                {/* T-IX-004: Server-sourced week summary row */}
                {prefillData && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Esta semana:</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
                      {prefillData.tradeCount} trades
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                      style={{
                        color:       prefillData.netPnl >= 0 ? "var(--win)" : "var(--loss)",
                        background:  prefillData.netPnl >= 0 ? "var(--win-soft)" : "var(--loss-soft)",
                      }}
                    >
                      {prefillData.netPnl >= 0 ? "+" : ""}${prefillData.netPnl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
                      {prefillData.winRate.toFixed(0)}% WR
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: disciplineBg(prefillData.disciplineScore),
                        color:      disciplineColor(prefillData.disciplineScore),
                      }}
                    >
                      {prefillData.disciplineScore}/100 disc.
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-[var(--radius-sm)] p-4" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Resumen automático · {week?.label}</p>
                  {generated && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>✨ Auto-generado de tus trades</span>
                  )}
                </div>
                {generated ? (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Trades",    value: generated.tradeCount.toString(), color: "var(--ink)", bg: "var(--chip)" },
                      { label: "Net P&L",   value: formatPnl(generated.netPnl), color: generated.netPnl >= 0 ? "var(--win)" : "var(--loss)", bg: generated.netPnl >= 0 ? "var(--win-soft)" : "var(--loss-soft)" },
                      { label: "Win Rate",  value: `${generated.winRate}%`, color: generated.winRate >= 55 ? "var(--win)" : "var(--loss)", bg: generated.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)" },
                      { label: "Disciplina", value: `${generated.disciplineScore}`, color: disciplineColor(generated.disciplineScore), bg: disciplineBg(generated.disciplineScore) },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className="flex flex-col items-center py-2 rounded-lg" style={{ background: bg }}>
                        <span className="font-mono font-bold text-base" style={{ color }}>{value}</span>
                        <span className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ink-3)] italic text-center py-3">Selecciona una semana y cuenta para ver los stats automáticos</p>
                )}
              </div>
            </div>
          )}

          {step === "analisis" && (
            <div className="flex flex-col gap-4 py-2">
              {[
                { key: "executiveSummary", label: "📋 Resumen ejecutivo", value: executiveSummary, set: setExecutiveSummary, placeholder: "Describe los puntos clave de la semana en 3-5 líneas...", rows: 3 },
                { key: "whatWorked",       label: "✅ ¿Qué funcionó bien?", value: whatWorked, set: setWhatWorked, placeholder: "• Punto 1\n• Punto 2\n• Punto 3", rows: 4 },
                { key: "toImprove",        label: "🔧 A mejorar la próxima semana", value: toImprove, set: setToImprove, placeholder: "• Punto 1\n• Punto 2\n• Punto 3", rows: 4 },
              ].map(({ key, label, value, set, placeholder, rows }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>{label}</label>
                    {autoFields.has(key) && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>✨ Auto-generado</span>
                    )}
                  </div>
                  <Textarea value={value} onChange={(e) => { set(e.target.value); markEdited(key) }} placeholder={placeholder} rows={rows} />
                </div>
              ))}

              {reviewResources.length > 0 && (
                <div className="rounded-[var(--radius-sm)] overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                  <button onClick={() => setResourcesOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background: "var(--panel-2)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>📚 Aprendizajes pendientes ({reviewResources.length})</span>
                    {resourcesOpen ? <ChevronUp size={14} style={{ color: "var(--ink-3)" }} /> : <ChevronDown size={14} style={{ color: "var(--ink-3)" }} />}
                  </button>
                  {resourcesOpen && (
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {reviewResources.map((res) => (
                        <label key={res.id} className="flex items-start gap-3 cursor-pointer">
                          <div
                            className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                            style={{ background: linkedResources.includes(res.id) ? "var(--accent)" : "var(--panel)", borderColor: linkedResources.includes(res.id) ? "var(--accent)" : "var(--line)" }}
                            onClick={() => toggleResource(res.id)}
                          >
                            {linkedResources.includes(res.id) && <Check size={10} style={{ color: "white" }} />}
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>{res.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>{res.author} · {res.type}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-[var(--radius-sm)] p-4 text-center" style={{ background: discBg, border: `1px solid ${discColor}33` }}>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: discColor }}>Score de disciplina</p>
                  {autoFields.has("disciplineScore") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>✨ Auto-calculado</span>
                  )}
                </div>
                <input
                  type="number" min={0} max={100} value={disciplineScore}
                  onChange={(e) => { setDisciplineScore(Math.max(0, Math.min(100, Number(e.target.value)))); markEdited("disciplineScore") }}
                  className="w-28 text-center font-mono font-bold rounded-[var(--radius-sm)] border outline-none focus:ring-2"
                  style={{ fontSize: 40, lineHeight: 1.2, color: discColor, background: "transparent", borderColor: `${discColor}44` }}
                />
                <p className="text-[11px] mt-3" style={{ color: "var(--ink-3)" }}>0 = caos total · 100 = ejecución perfecta</p>
                <div className="mt-3"><DisciplineBar score={disciplineScore} /></div>
                {serverScore?.breakdown && (
                  <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                    {[
                      { label: "Ejecución", value: Math.round(serverScore.breakdown.execution), max: 50 },
                      { label: "Aprendizaje", value: Math.round(serverScore.breakdown.learning), max: 30 },
                      { label: "Reglas", value: Math.round(serverScore.breakdown.adherence), max: 20 },
                    ].map(({ label, value, max }) => (
                      <span key={label} className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
                        {label}: <span className="font-semibold font-mono" style={{ color: "var(--ink)" }}>{value}/{max}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "config" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="ghost" onClick={() => runAutoGenerate(selectedWeek, effectiveAccountId)}>✨ Auto-generar</Button>
              <Button variant="primary" onClick={() => { runAutoGenerate(selectedWeek, effectiveAccountId); setStep("analisis") }}>Siguiente →</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("config")}>← Atrás</Button>
              <Button variant="ghost" onClick={() => handleSave("draft")} disabled={createReview.isPending}>
                {createReview.isPending ? "Guardando…" : "Guardar borrador"}
              </Button>
              <Button variant="primary" onClick={() => handleSave("submitted")} disabled={createReview.isPending}>
                {createReview.isPending ? "Enviando…" : "Enviar review"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
