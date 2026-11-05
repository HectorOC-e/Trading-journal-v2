import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261105023500_durable_account_deletions.sql",
    import.meta.url,
  ),
  "utf8",
);
describe("deletion migration security invariants", () => {
  it("keeps the durable job independent of application/Auth identities", () => {
    const table = sql.match(
      /CREATE TABLE public.account_deletion_jobs\s*\(([\s\S]*?)\n\);/,
    )![1];
    expect(table).not.toMatch(/REFERENCES|FOREIGN KEY/i);
    expect(table).toMatch(/user_id uuid PRIMARY KEY/);
    expect(table).not.toMatch(/email|password|secret|payload|token text/i);
  });
  it("denies public job access and permits the cleanup service", () => {
    expect(sql).toMatch(/account_deletion_jobs ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(
      /REVOKE ALL ON public.account_deletion_jobs FROM PUBLIC, anon, authenticated/,
    );
    expect(sql).toMatch(
      /GRANT ALL ON public.account_deletion_jobs TO service_role/,
    );
  });
  it("restricts authenticated inserts and updates without limiting service cleanup", () => {
    for (const operation of ["INSERT", "UPDATE"])
      expect(sql).toContain(`AS RESTRICTIVE FOR ${operation} TO authenticated`);
    expect(sql).not.toMatch(/AS RESTRICTIVE FOR \w+ TO service_role/);
    expect(sql).toContain("SECURITY DEFINER SET search_path = ''");
    expect(sql).toContain("WHERE user_id = auth.uid()");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION private.account_deletion_blocked() FROM PUBLIC, anon",
    );
  });
  it("leaves scheduled delivery inactive until the production route is deployed", () => {
    expect(sql).toMatch(/cron\.alter_job\([\s\S]*active := false/);
  });
});
