import { describe, expect, it } from "vitest"
import { serverlessDatabaseUrl } from "@/lib/db-connection"

describe("serverlessDatabaseUrl", () => {
  it("uses Supavisor transaction mode on Vercel without changing credentials", () => {
    const url = "postgresql://postgres.project:p%40ss@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"
    const next = new URL(serverlessDatabaseUrl(url, true))
    expect(next.port).toBe("6543")
    expect(next.username).toBe("postgres.project")
    expect(next.password).toBe("p%40ss")
    expect(next.searchParams.get("sslmode")).toBe("require")
  })

  it("preserves direct, local, already transactional and non-Supabase connections", () => {
    for (const url of [
      "postgresql://user:pass@db.project.supabase.co:5432/postgres",
      "postgresql://user:pass@localhost:5432/postgres",
      "postgresql://user:pass@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
      "postgresql://user:pass@db.example.com:5432/postgres",
      "postgresql://user:pass@pooler.supabase.com.attacker.example:5432/postgres",
    ]) expect(serverlessDatabaseUrl(url, true)).toBe(url)
  })

  it("preserves session mode outside Vercel", () => {
    const url = "postgresql://user:pass@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
    expect(serverlessDatabaseUrl(url, false)).toBe(url)
  })
})
