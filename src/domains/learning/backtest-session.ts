import { z } from "zod"
import { localDateISO } from "@/lib/datetime/local"

export const backtestDay = z.iso.date()
const uuid = z.uuid()
const note = z.string().trim().max(3000)
const objective = z.object({
  title: z.string().trim().min(1).max(180), criterion: z.string().trim().min(1).max(1000),
  metric: z.enum(["manual", "closed", "checklist", "expectancy"]),
  threshold: z.number().min(-1000).max(1000), minSample: z.number().int().min(1).max(250),
}).refine(o => o.metric === "closed" ? Number.isInteger(o.threshold) && o.threshold >= 1 && o.threshold <= 250
  : o.metric === "checklist" ? o.threshold >= 0 && o.threshold <= 100 : true, "Umbral fuera de rango")

export const backtestPlanInput = z.object({
  title: z.string().trim().min(1).max(160), hypothesis: z.string().trim().min(1).max(3000),
  symbols: z.string().trim().min(1).max(120), timeframe: z.string().trim().min(1).max(50),
  from: backtestDay, to: backtestDay, rules: note, invalidation: note, exitRules: note, assumptions: note,
  objectives: z.array(objective).min(1).max(10),
}).refine(p => p.from <= p.to, "El inicio debe ser anterior al final")

export type BacktestPlanInput = z.infer<typeof backtestPlanInput>
export type BacktestSetup = { id: string; name: string; market: string; direction: string; description: string; checklist: string[]; version: number | null; criterion: string | null }
export type BacktestPlan = BacktestPlanInput & { setup: BacktestSetup | null }

const tradeAnnotation = z.object({
  context: note.optional(), entryReason: note.optional(), riskPlan: note.optional(), adjustmentReason: note.optional(),
  exitReason: note.optional(), lesson: note.optional(), outOfRange: note.optional(), excluded: note.optional(), compliant: z.boolean().nullable().optional(),
  adjustments: z.array(z.object({ date: backtestDay, time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    price: z.string().trim().max(24).refine(value => /^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0), reason: note.min(1),
  })).max(25).optional(),
})
export const backtestAssessment = z.enum(["achieved", "partial", "repeat", "insufficient"])
export const backtestWorkSchema = z.object({
  workDays: z.array(backtestDay).max(100),
  tradeIds: z.array(uuid).max(250), practiceIds: z.array(uuid).max(50),
  tradeNotes: z.record(uuid, tradeAnnotation).refine(v => Object.keys(v).length <= 250),
  signals: z.array(z.object({ date: backtestDay, symbol: z.string().trim().max(40), context: note, reason: note.min(1), captureId: uuid.optional() })).max(100),
  captureIds: z.array(uuid).max(8), observations: note,
  conclusion: note, nextStep: note,
  evaluations: z.record(z.string().regex(/^[0-9]$/), z.object({ state: backtestAssessment, comment: note })).refine(v => Object.keys(v).length <= 10),
  coach: z.string().trim().max(6000).nullable(),
})

export type BacktestWork = z.infer<typeof backtestWorkSchema>
const recoverableWork = backtestWorkSchema.extend({
  signals: z.array(backtestWorkSchema.shape.signals.element.extend({ date: z.string().max(10), reason: note })).max(100),
  tradeNotes: z.record(uuid, tradeAnnotation.extend({ adjustments: z.array(z.object({ date: z.string().max(10), time: z.string().max(5), price: z.string().max(24), reason: note })).max(25).optional() })).refine(v => Object.keys(v).length <= 250),
})
export const backtestDraftSchema = z.object({ revision: z.number().int().positive(), work: recoverableWork })
export const emptyBacktestWork: BacktestWork = { workDays: [], tradeIds: [], practiceIds: [], tradeNotes: {}, signals: [], captureIds: [], observations: "", conclusion: "", nextStep: "", evaluations: {}, coach: null }
export const ASSESSMENT_LABELS = { achieved: "Logrado", partial: "Parcial", repeat: "Pendiente de repetir", insufficient: "Sin evidencia suficiente" } satisfies Record<z.infer<typeof backtestAssessment>, string>

export type BacktestTrade = {
  id: string; date: string; r: number | null; pnl: string | null; currency: string; account: string;
  symbol: string; direction: string; status: string; marketOpenedAt: string | null; marketClosedAt: string | null; marketTimeZone: string | null;
  openTime: string; closeTime: string | null; entry: string; stop: string; target: string; closePrice: string | null; size: string;
  risk: string | null; commission: string | null; notes: string; planNotes: string | null;
  events: { type: string; at: string; price: string | null; size: string | null; notes: string; pnl: string | null }[];
  annotations: z.infer<typeof tradeAnnotation> | null;
  checklist: { compliant: boolean; source: "journal" | "session" } | null;
}

export type BacktestPractice = { id: string; title: string; date: string; duration: number; kind: string; objective: string; exercise: string; reflection: string; assessment: string | null }
export type BacktestCapture = { id: string; label: string; mime: string; data: string }
export type BacktestReportInput = Pick<BacktestWork, "workDays" | "signals" | "observations" | "conclusion" | "nextStep" | "evaluations" | "coach"> & {
  plan: BacktestPlan; trades: BacktestTrade[]; practices: BacktestPractice[]; captures: BacktestCapture[]; timeZone?: string;
}
export type BacktestReport = ReturnType<typeof buildBacktestReport>

function openingDay(trade: BacktestTrade) {
  if (!trade.marketOpenedAt || !trade.marketTimeZone) return trade.date
  try { return localDateISO(new Date(trade.marketOpenedAt), trade.marketTimeZone) }
  catch { return trade.date }
}

function closeSortKey(trade: BacktestTrade) {
  return trade.marketClosedAt ?? `${trade.date}T${trade.closeTime ?? "00:00"}:00Z`
}

function roundR(value: number) { return Math.round(value * 1000) / 1000 }

export function buildBacktestReport(input: BacktestReportInput) {
  const blockers: string[] = []
  const warnings: string[] = []
  const trades = [...new Map(input.trades.map(t => [t.id, t])).values()]
    .sort((a, b) => closeSortKey(a).localeCompare(closeSortKey(b)) || a.id.localeCompare(b.id))
    .map(t => {
      const date = openingDay(t)
      const outsideRange = date < input.plan.from || date > input.plan.to
      const included = t.status === "CLOSED"
      if (!included && t.status !== "CANCELLED" && !t.annotations?.excluded) blockers.push(`${t.symbol} (${date}) sigue abierta. Ciérrala o justifica su exclusión.`)
      if (outsideRange && !t.annotations?.outOfRange) blockers.push(`${t.symbol} (${date}) está fuera del rango histórico. Añade una justificación.`)
      return { ...t, outsideRange, included }
    })
  const closed = trades.filter(t => t.included)
  if (!closed.length && !input.practices.length && !input.signals.length) blockers.push("Vincula una operación cerrada, una práctica o una señal descartada.")
  const missingReasons = closed.filter(t => !t.annotations?.entryReason || !t.annotations?.exitReason).length
  if (missingReasons) warnings.push(`${missingReasons} operaciones con motivos de entrada o salida sin documentar.`)
  const rated = closed.filter((t): t is typeof t & { r: number } => t.r !== null && Number.isFinite(t.r))
  if (rated.length && rated.some(t => !t.marketClosedAt)) warnings.push("La curva usa la fecha disponible cuando falta la hora de cierre de mercado.")
  const evaluated = closed.filter(t => t.checklist !== null)
  const results = closed.flatMap(t => {
    const value = t.pnl === null ? t.r : Number(t.pnl)
    return value !== null && Number.isFinite(value) ? [value] : []
  })
  const wins = results.filter(n => n > 0).length
  const losses = results.filter(n => n < 0).length
  const moneyCents = new Map<string, number>()
  for (const trade of closed) {
    if (trade.pnl !== null && Number.isFinite(Number(trade.pnl))) {
      moneyCents.set(trade.currency, (moneyCents.get(trade.currency) ?? 0) + Math.round(Number(trade.pnl) * 100))
    }
  }
  let cumulative = 0
  let peak = 0
  let drawdown = 0
  const curve = [{ id: "start", date: "", r: 0 }]
  for (const trade of rated) {
    cumulative = roundR(cumulative + trade.r)
    peak = Math.max(peak, cumulative)
    drawdown = Math.max(drawdown, peak - cumulative)
    curve.push({ id: trade.id, date: closeSortKey(trade), r: cumulative })
  }
  const expectancy = rated.length ? roundR(cumulative / rated.length) : null
  const checklistPct = evaluated.length ? evaluated.filter(t => t.checklist?.compliant).length / evaluated.length * 100 : null
  const objectives = input.plan.objectives.map((o, i) => {
    const evalNote = input.evaluations[String(i)]
    if (o.metric === "manual") {
      if (!evalNote) blockers.push(`Evalúa el objetivo «${o.title}».`)
      return { ...o, state: evalNote?.state ?? "insufficient" as const, observed: null, sample: null, comment: evalNote?.comment ?? "" }
    }
    const sample = o.metric === "checklist" ? evaluated.length : o.metric === "expectancy" ? rated.length : closed.length
    const observed = o.metric === "checklist" ? checklistPct : o.metric === "expectancy" ? expectancy : closed.length
    const state = observed === null || (o.metric !== "closed" && sample < o.minSample) ? "insufficient" as const : observed >= o.threshold ? "achieved" as const : "repeat" as const
    return { ...o, state, observed, sample, comment: evalNote?.comment ?? "" }
  })
  if (objectives.some(o => o.state === "insufficient")) warnings.push("Uno o más objetivos tienen evidencia insuficiente.")
  return {
    schemaVersion: 1 as const, ...input, trades, objectives, blockers, warnings,
    metrics: { closed: closed.length, wins, losses, neutral: results.length - wins - losses, resultCoverage: results.length,
      winRate: results.length ? wins / results.length * 100 : null, rCoverage: rated.length, expectancy,
      drawdown: rated.length ? roundR(drawdown) : null, curve, checklistCoverage: evaluated.length, checklistPct,
      money: Object.fromEntries([...moneyCents].map(([currency, cents]) => [currency, cents / 100])),
    },
  }
}
