// ─────────────────────────────────────────────────────────────────────────────
// ImprovementScore snapshots (closure B1, E19). Persists ONE row per user per day
// so the North Star (#41) has a time series — the "vs hace 3 meses" relato. Run
// daily by the recompute-insights cron. Read back as a series for the curve.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { getImprovement } from "@/server/services/improvement/improvement-service"

const todayUtc = () => new Date(new Date().toISOString().slice(0, 10))

/** Compute + upsert today's ImprovementScore snapshot for one user (no-op without data). */
export async function recordImprovementSnapshot(prisma: PrismaClient, userId: string): Promise<boolean> {
  const ov = await getImprovement(prisma, userId)
  if (!ov.hasData) return false
  const date = todayUtc()
  const data = {
    score: ov.improvement.score,
    discipline: ov.inputs.disciplineRolling,
    expectancy: ov.inputs.expectancyR,
    commitment: ov.inputs.commitmentKeptRate,
    cost: ov.inputs.costOfIndisciplineRatio,
    drivers: ov.improvement.drivers as unknown as object,
    sampleSize: ov.sampleSize,
  }
  await prisma.improvementScore.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  })
  return true
}

/** Daily snapshot pass over every user with closed trades. Best-effort per user. */
export async function recordImprovementSnapshotForAll(prisma: PrismaClient): Promise<{ users: number; recorded: number }> {
  const users = await prisma.trade.findMany({ where: { status: "CLOSED" }, distinct: ["userId"], select: { userId: true } })
  let recorded = 0
  for (const { userId } of users) {
    try { if (await recordImprovementSnapshot(prisma, userId)) recorded++ } catch { /* per-user best-effort */ }
  }
  return { users: users.length, recorded }
}

export interface ImprovementPoint {
  date: string
  score: number
}

/** Recent ImprovementScore series (ascending) for the curve. */
export async function getImprovementSeries(prisma: PrismaClient, userId: string, days = 90): Promise<ImprovementPoint[]> {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - days)
  const rows = await prisma.improvementScore.findMany({
    where: { userId, date: { gte: new Date(from.toISOString().slice(0, 10)) } },
    orderBy: { date: "asc" },
    select: { date: true, score: true },
  })
  return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), score: r.score }))
}
