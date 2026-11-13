import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { getTaxRulesStatus } from "@/server/services/tax/rules/status-service";
import { HN_ISR_2026 } from "@/domains/tax/rules/hn/2026";
const { checksum, ...payload } = HN_ISR_2026;
const baseline = {
  year: 2026,
  version: HN_ISR_2026.version,
  checksum,
  payload,
  createdAt: new Date("2026-01-24"),
};
function fixture() {
  return {
    taxRuleSet: { findMany: vi.fn().mockResolvedValue([baseline]) },
    taxRuleSyncState: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          status: "SOURCE_UNAVAILABLE",
          lastAttemptAt: new Date("2026-11-13"),
          lastSuccessAt: null,
          reasonCode: "SOURCE_TIMEOUT",
        }),
    },
    taxRuleUpdate: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}
describe("public fiscal rule status", () => {
  it("keeps the validated rule available when the source check fails", async () => {
    const db = fixture();
    expect(
      await getTaxRulesStatus(db as unknown as PrismaClient, 2026),
    ).toMatchObject({
      available: true,
      active: { version: HN_ISR_2026.version },
      sync: { status: "SOURCE_UNAVAILABLE" },
    });
  });
  it("does not claim an unpublished future year is available", async () => {
    const db = fixture();
    expect(
      await getTaxRulesStatus(db as unknown as PrismaClient, 2027),
    ).toMatchObject({ available: false, active: null, updates: [] });
  });
  it("rejects a corrupt package instead of displaying it as usable", async () => {
    const db = fixture();
    db.taxRuleSet.findMany.mockResolvedValue([
      { ...baseline, checksum: "0".repeat(64) },
    ]);
    expect(
      await getTaxRulesStatus(db as unknown as PrismaClient, 2026),
    ).toMatchObject({ available: false, active: null });
  });
  it("handles preview-before-migration without inventing a successful check", async () => {
    const db = fixture();
    db.taxRuleSyncState.findUnique.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("missing table", {
        code: "P2021",
        clientVersion: "7",
      }),
    );
    expect(
      await getTaxRulesStatus(db as unknown as PrismaClient, 2026),
    ).toMatchObject({ available: true, sync: { status: "SETUP_PENDING" } });
  });
});
