import { createHash } from "node:crypto"
import { isDeepStrictEqual } from "node:util"
import { TRPCError } from "@trpc/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { BacktestSession, Prisma, PrismaClient } from "@/lib/generated/prisma/client"
import { backtestWorkSchema, buildBacktestReport, type BacktestCapture, type BacktestPlan, type BacktestReport, type BacktestTrade, type BacktestWork } from "@/domains/learning/backtest-session"
import { localDateISO } from "@/lib/datetime/local"
import { imageMime } from "./practice-feedback-service"

type Db = Prisma.TransactionClient
export const backtestTradeScope = { operationalMode: "BACKTEST", account: { type: "BACKTEST" } } satisfies Prisma.TradeWhereInput
export const backtestPracticeScope = { OR: [{ operationalMode: "BACKTEST", kind: { in: ["EXECUTION", "REVIEW"] } }, { operationalMode: null, kind: "CONCEPT" }] } satisfies Prisma.LearningPracticeWhereInput

export async function ownedBacktest(db: Db, userId: string, id: string) {
  const row = await db.backtestSession.findUnique({ where: { userId_id: { userId, id } } })
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no disponible." })
  return row
}

export const readPlan = (row: BacktestSession) => row.plan as unknown as BacktestPlan

export async function readBacktestWork(db: Db, row: BacktestSession): Promise<BacktestWork> {
  const scope = { userId: row.userId, sessionId: row.id }
  const trades = await db.backtestSessionTrade.findMany({ where: scope, orderBy: { tradeId: "asc" }, select: { tradeId: true } })
  const practices = await db.backtestSessionPractice.findMany({ where: scope, orderBy: { practiceId: "asc" }, select: { practiceId: true } })
  return backtestWorkSchema.parse({ ...(row.work as object), workDays: row.workDays, tradeIds: trades.map(t => t.tradeId), practiceIds: practices.map(p => p.practiceId) })
}

export function storedWork(work: BacktestWork): Prisma.InputJsonObject {
  const { workDays, tradeIds, practiceIds, ...fields } = work
  void workDays; void tradeIds; void practiceIds
  return fields
}

export async function localBacktestDay(db: Db, userId: string) {
  const profile = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })
  return localDateISO(new Date(), profile.timezone)
}

export async function validatedBacktestLinks(db: Db, userId: string, work: BacktestWork) {
  const tradeIds = [...new Set(work.tradeIds)]
  const practiceIds = [...new Set(work.practiceIds)]
  const trades = await db.trade.count({ where: { id: { in: tradeIds }, userId, ...backtestTradeScope, account: { ...backtestTradeScope.account, userId } } })
  const practices = await db.learningPractice.findMany({ where: { id: { in: practiceIds }, userId, ...backtestPracticeScope }, select: { date: true, attachments: { select: { id: true } }, tradeLinks: { where: { userId }, select: { tradeId: true } } } })
  if (trades !== tradeIds.length || practices.length !== practiceIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona evidencia propia de Backtesting o una práctica conceptual." })
  const includedTradeIds = new Set([...tradeIds, ...practices.flatMap(p => p.tradeLinks.map(t => t.tradeId))])
  if (includedTradeIds.size > 250) throw new TRPCError({ code: "BAD_REQUEST", message: "La sesión admite hasta 250 operaciones en total." })
  const attachments = new Set(practices.flatMap(p => p.attachments.map(a => a.id)))
  if ([...work.captureIds, ...work.signals.flatMap(s => s.captureId ? [s.captureId] : [])].some(id => !attachments.has(id))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona capturas de las prácticas vinculadas." })
  }
  const workDays = [...new Set([...work.workDays, ...practices.map(p => p.date.toISOString().slice(0, 10))])].sort()
  const today = await localBacktestDay(db, userId)
  if (workDays.length > 100 || workDays.some(day => day > today)) throw new TRPCError({ code: "BAD_REQUEST", message: "Registra hasta 100 jornadas con fecha efectiva." })
  return { workDays, tradeIds, practiceIds, includedTradeIds }
}

export async function saveBacktestWork(prisma: PrismaClient, userId: string, input: { id: string; revision: number; work: BacktestWork }) {
  return prisma.$transaction(async tx => {
    const row = await ownedBacktest(tx, userId, input.id)
    assertRevision(row, input.revision, "ACTIVE")
    const links = await validatedBacktestLinks(tx, userId, input.work)
    const work = { ...input.work, tradeNotes: Object.fromEntries(Object.entries(input.work.tradeNotes).filter(([id]) => links.includedTradeIds.has(id))) }
    const result = await tx.backtestSession.updateMany({ where: { id: row.id, userId, revision: input.revision, status: "ACTIVE" }, data: { work: storedWork(work), workDays: links.workDays, evidenceCount: links.includedTradeIds.size, revision: { increment: 1 } } })
    if (!result.count) conflict()
    const scope = { userId, sessionId: row.id }
    await tx.backtestSessionTrade.deleteMany({ where: scope })
    await tx.backtestSessionPractice.deleteMany({ where: scope })
    if (links.tradeIds.length) await tx.backtestSessionTrade.createMany({ data: links.tradeIds.map(tradeId => ({ ...scope, tradeId })) })
    if (links.practiceIds.length) await tx.backtestSessionPractice.createMany({ data: links.practiceIds.map(practiceId => ({ ...scope, practiceId })) })
    return { revision: row.revision + 1 }
  })
}

function conflict(message = "La sesión cambió. Recarga su última versión y vuelve a revisar."): never {
  throw new TRPCError({ code: "CONFLICT", message })
}

export function assertRevision(row: BacktestSession, revision: number, status: string) {
  if (row.revision !== revision || row.status !== status) conflict()
}

const tradeDetails = {
  account: { select: { name: true, currency: true } },
  checklistResult: true,
  events: { orderBy: [{ timestamp: "asc" }, { id: "asc" }] },
} satisfies Prisma.TradeInclude

export async function loadBacktestEvidence(db: Db, row: BacktestSession) {
  const plan = readPlan(row)
  const work = await readBacktestWork(db, row)
  const userId = row.userId
  const practices = await db.learningPractice.findMany({ where: { userId, id: { in: work.practiceIds }, ...backtestPracticeScope }, orderBy: [{ date: "asc" }, { id: "asc" }], include: {
    tradeLinks: { where: { userId }, select: { tradeId: true } }, attachments: { orderBy: { id: "asc" } },
  } })
  const ids = [...new Set([...work.tradeIds, ...practices.flatMap(p => p.tradeLinks.map(l => l.tradeId))])]
  if (ids.length > 250) throw new TRPCError({ code: "BAD_REQUEST", message: "La evidencia vinculada ahora supera las 250 operaciones. Reduce la selección." })
  const rows = await db.trade.findMany({ where: { userId, id: { in: ids }, ...backtestTradeScope, account: { ...backtestTradeScope.account, userId } }, include: tradeDetails, orderBy: { id: "asc" } })
  const trades: BacktestTrade[] = rows.map(t => {
    const annotations = work.tradeNotes[t.id] ?? null
    const recorded = t.checklistResult?.userId === userId ? t.checklistResult : null
    const checklist = plan.setup?.checklist ?? []
    // A complete matching checklist is verifiable even for legacy journal data.
    const journalChecklist = !!plan.setup && !!recorded && recorded.setupId === plan.setup.id && checklist.length > 0 && recorded.itemsTotal === checklist.length &&
      new Set(recorded.itemsChecked).size === checklist.length && checklist.every(item => recorded.itemsChecked.includes(item))
    return {
      id: t.id, date: t.date.toISOString().slice(0, 10), r: t.rMultiple?.toNumber() ?? null, pnl: t.pnl?.toString() ?? null,
      account: t.account.name, currency: t.account.currency, symbol: t.symbol, direction: t.direction, status: t.status,
      marketOpenedAt: t.marketOpenedAt?.toISOString() ?? null, marketClosedAt: t.marketClosedAt?.toISOString() ?? null, marketTimeZone: t.marketTimeZone,
      openTime: t.openTime, closeTime: t.closeTime, entry: t.entry.toString(), stop: t.stop.toString(), target: t.target.toString(),
      closePrice: t.closePrice?.toString() ?? null, size: (t.originalSize ?? t.size).toString(), risk: t.originalRiskMoney?.toString() ?? null, commission: t.commission?.toString() ?? null,
      notes: t.notes, planNotes: t.planNotes,
      events: t.events.filter(e => e.userId === userId).map(e => ({ type: e.type, at: e.timestamp.toISOString(), price: e.price?.toString() ?? null, size: e.contracts?.toString() ?? null, notes: e.notes, pnl: e.realizedPnl?.toString() ?? null })),
      annotations, checklist: typeof annotations?.compliant === "boolean" ? { compliant: annotations.compliant, source: "session" } : journalChecklist ? { compliant: true, source: "journal" } : null,
    }
  })
  const attachments = practices.flatMap(p => p.attachments.map(a => ({ id: a.id, path: a.path, mime: a.mime, practiceId: p.id, label: p.title })))
  const requested = new Set([...work.captureIds, ...work.signals.flatMap(s => s.captureId ? [s.captureId] : [])])
  const captures = attachments.filter(a => requested.has(a.id))
  const { timezone } = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })
  const { workDays, signals, observations, conclusion, nextStep, evaluations, coach } = work
  const report = buildBacktestReport({ workDays, signals, observations, conclusion, nextStep, evaluations, coach, plan, trades, timeZone: timezone, captures: [], practices: practices.map(p => ({ id: p.id, title: p.title, date: p.date.toISOString().slice(0, 10), duration: p.durationMin, kind: p.kind, objective: p.objective, exercise: p.exercise, reflection: p.reflection, assessment: p.assessment })) })
  if (rows.length !== ids.length || practices.length !== work.practiceIds.length) report.blockers.push("Parte de la evidencia dejó de pertenecer a Backtesting. Revisa los vínculos antes de cerrar.")
  if (captures.length !== requested.size) report.blockers.push("Hay capturas seleccionadas que ya no están disponibles. Actualiza la selección.")
  if (captures.length > 8) report.blockers.push("Selecciona hasta ocho capturas para el informe.")
  if (!work.conclusion || !work.nextStep) report.blockers.push("Escribe una conclusión y el siguiente paso.")
  const practiceTradeIds: Record<string, string[]> = {}
  for (const p of practices) for (const { tradeId } of p.tradeLinks) (practiceTradeIds[tradeId] ??= []).push(p.id)
  return { report, captures, attachments, work, practiceTradeIds }
}

type Evidence = Awaited<ReturnType<typeof loadBacktestEvidence>>
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024

async function copyCaptures(storage: SupabaseClient["storage"] | null, evidence: Evidence) {
  const captures: BacktestCapture[] = []
  let totalBytes = 0
  for (const item of evidence.captures.slice(0, 8)) {
    const result = await storage?.from("practice-images").download(item.path)
    if (!result || result.error || !result.data) { evidence.report.blockers.push(`No se pudo leer una captura de «${item.label}».`); continue }
    totalBytes += result.data.size
    if (totalBytes > MAX_CAPTURE_BYTES) { evidence.report.blockers.push("Las capturas del PDF superan 8 MB en conjunto."); break }
    const bytes = Buffer.from(await result.data.arrayBuffer())
    const mime = imageMime(bytes)
    if (!mime || mime !== item.mime) { evidence.report.blockers.push(`Una captura de «${item.label}» tiene un formato inválido.`); continue }
    captures.push({ id: item.id, label: item.label, mime, data: bytes.toString("base64") })
  }
  return captures
}

function evidenceSignature(evidence: Evidence, captures: BacktestCapture[]) {
  return createHash("sha256").update(JSON.stringify({ report: evidence.report, attachments: evidence.captures, captures })).digest("hex")
}

export async function previewBacktest(prisma: PrismaClient, userId: string, id: string, storage: SupabaseClient["storage"] | null) {
  const evidence = await prisma.$transaction(async tx => loadBacktestEvidence(tx, await ownedBacktest(tx, userId, id)), { isolationLevel: "RepeatableRead" })
  const captures = await copyCaptures(storage, evidence)
  const previous = await prisma.backtestSessionReport.findFirst({ where: { userId, sessionId: id }, orderBy: { number: "desc" }, select: { snapshot: true } })
  const prior = previous?.snapshot as unknown as BacktestReport | undefined
  const changes = prior ? [
    ...evidenceDiff(prior.trades, evidence.report.trades, "Operación"),
    ...evidenceDiff(prior.practices, evidence.report.practices, "Práctica"),
  ] : []
  return { report: evidence.report, signature: evidenceSignature(evidence, captures), changes }
}

function evidenceDiff<T extends { id: string }>(prior: T[], current: T[], label: string) {
  const before = new Map(prior.map(row => [row.id, row]))
  const after = new Set(current.map(row => row.id))
  const name = (row: T) => ("symbol" in row ? row.symbol : "title" in row ? row.title : row.id)
  return [
    ...current.flatMap(row => !before.has(row.id) ? [`${label} añadida · ${name(row)}`] : !isDeepStrictEqual(before.get(row.id), row) ? [`${label} actualizada · ${name(row)}`] : []),
    ...prior.flatMap(row => !after.has(row.id) ? [`${label} retirada · ${name(row)}`] : []),
  ]
}

export async function closeBacktest(prisma: PrismaClient, userId: string, input: { id: string; revision: number; requestId: string; signature: string }, storage: SupabaseClient["storage"] | null) {
  const key = { userId, sessionId: input.id, requestId: input.requestId }
  const findRetry = () => prisma.backtestSessionReport.findUnique({ where: { userId_sessionId_requestId: key }, select: { number: true } })
  const retry = await findRetry()
  if (retry) return retry
  try {
    const proposed = await prisma.$transaction(async tx => {
      const row = await ownedBacktest(tx, userId, input.id)
      assertRevision(row, input.revision, "ACTIVE")
      return loadBacktestEvidence(tx, row)
    }, { isolationLevel: "RepeatableRead" })
    const captures = await copyCaptures(storage, proposed)
    if (proposed.report.blockers.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: proposed.report.blockers[0] })
    if (evidenceSignature(proposed, captures) !== input.signature) conflict("La evidencia cambió. Actualiza el resumen antes de cerrar.")
    return await prisma.$transaction(async tx => {
      const alreadyClosed = await tx.backtestSessionReport.findUnique({ where: { userId_sessionId_requestId: key }, select: { number: true } })
      if (alreadyClosed) return alreadyClosed
      const row = await ownedBacktest(tx, userId, input.id)
      assertRevision(row, input.revision, "ACTIVE")
      const evidence = await loadBacktestEvidence(tx, row)
      if (evidenceSignature(evidence, captures) !== input.signature) conflict("La evidencia cambió. Actualiza el resumen antes de cerrar.")
      const number = row.reportNumber + 1
      const updated = await tx.backtestSession.updateMany({ where: { id: row.id, userId, revision: row.revision, status: "ACTIVE" }, data: { status: "CLOSED", revision: { increment: 1 }, reportNumber: number, evidenceCount: evidence.report.trades.length } })
      if (!updated.count) conflict()
      return tx.backtestSessionReport.create({ data: { ...key, number, snapshot: { ...evidence.report, captures } }, select: { number: true } })
    }, { isolationLevel: "RepeatableRead" })
  } catch (error) {
    const concurrent = await findRetry()
    if (concurrent) return concurrent
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") conflict()
    throw error
  }
}
