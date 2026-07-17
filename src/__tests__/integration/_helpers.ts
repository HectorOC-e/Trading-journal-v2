import { PrismaClient } from "@/lib/generated/prisma/client"
import { randomUUID } from "node:crypto"

// Safety: these tests DELETE rows. Refuse to run against anything but a local DB.
const url = process.env.DATABASE_URL ?? ""
const host = (() => {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
})()
if (!/^(localhost|127\.0\.0\.1)$/.test(host)) {
  throw new Error(
    `Integration tests refuse to run against a non-local DATABASE_URL (host="${host}"). ` +
      `Point DATABASE_URL at the supabase local stack.`,
  )
}

export const prisma = new PrismaClient()

/** Create an ephemeral user; deleting it cascades to insights + domain_events. */
export async function makeUser(): Promise<string> {
  const id = randomUUID()
  await prisma.user.create({ data: { id, email: `it-${id}@example.test` } })
  return id
}

export async function dropUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } }).catch(() => {})
}
