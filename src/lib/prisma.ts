import { PrismaClient } from "./generated/prisma/client"
import { PrismaPg }     from "@prisma/adapter-pg"

function createPrisma() {
  // Serverless connection hygiene: each warm instance keeps ONE small pool.
  // Without `max`, node-postgres opens up to 10 connections per instance, and
  // with many concurrent serverless instances that exhausts the Supabase pooler
  // (EMAXCONNSESSION). Keep the per-instance pool tiny and release idle conns fast.
  // NOTE: DATABASE_URL should point to the TRANSACTION pooler (port 6543,
  // ?pgbouncer=true) for serverless — not session mode (5432).
  const adapter = new PrismaPg({
    connectionString:      process.env.DATABASE_URL!,
    max:                   Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis:     10_000,
    connectionTimeoutMillis: 10_000,
  })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
