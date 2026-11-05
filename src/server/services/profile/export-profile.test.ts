import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  PROFILE_EXPORT_SECTIONS,
  PROFILE_EXPORT_COVERAGE,
} from "@/domains/profile/export-sections";
import { exportProfilePage } from "./export-profile";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = id(99999);
describe("profile export pages", () => {
  it("exports beyond 5000 records in bounded, stable owned pages", async () => {
    const rows = Array.from({ length: 5101 }, (_, i) => ({ id: id(i + 1) }));
    const findMany = vi.fn(async ({ where, take }) =>
      rows.filter((r) => !where.id || r.id > where.id.gt).slice(0, take),
    );
    const prisma = { trade: { findMany } } as unknown as PrismaClient;
    const all: unknown[] = [];
    let cursor: string | undefined;
    do {
      const page = await exportProfilePage(prisma, userId, {
        section: "trades",
        cursor,
      });
      all.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(all).toEqual(rows);
    expect(findMany).toHaveBeenCalledTimes(52);
    for (const [args] of findMany.mock.calls) {
      expect(args.where.userId).toBe(userId);
      expect(args.take).toBeLessThanOrEqual(100);
    }
  });
  it.each([
    ["practiceAttachments", "practiceAttachment", "practice"],
    ["practiceFeedback", "practiceFeedback", "practice"],
    ["setupVersions", "setupVersion", "setup"],
  ])("joins ownership for %s", async (section, delegate, relation) => {
    const findMany = vi.fn().mockResolvedValue([]);
    await exportProfilePage(
      { [delegate]: { findMany } } as unknown as PrismaClient,
      userId,
      { section: section as "practiceAttachments" },
    );
    expect(findMany.mock.calls[0][0].where[relation]).toEqual({ userId });
  });
  it("rejects arbitrary delegates, invalid cursors and unbounded limits", async () => {
    const prisma = {} as PrismaClient;
    await expect(
      exportProfilePage(prisma, userId, {
        section: "userAiConfig" as "trades",
      }),
    ).rejects.toThrow();
    await expect(
      exportProfilePage(prisma, userId, { section: "trades", cursor: "bad" }),
    ).rejects.toThrow();
    await expect(
      exportProfilePage(prisma, userId, { section: "trades", limit: 101 }),
    ).rejects.toThrow();
  });
  it("removes nested credentials and serializes non-JSON scalar values", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          id: id(1),
          config: {
            nested: { api_key: "secret", ciphertext: "secret", color: "red" },
          },
          createdAt: new Date("2026-01-01Z"),
          count: BigInt(2),
          decimal: { toJSON: () => "1.20" },
        },
      ]);
    const result = await exportProfilePage(
      { customPalette: { findMany } } as unknown as PrismaClient,
      userId,
      { section: "customPalettes" },
    );
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.items[0]).toMatchObject({
      config: { nested: { color: "red" } },
      count: "2",
      decimal: "1.20",
    });
  });
});

describe("export manifest and singleton ownership", () => {
  it.each([
    ["user", "user", "id"],
    ["preferences", "userPreferences", "userId"],
    ["memoryIdentity", "memoryIdentity", "userId"],
  ])("scopes %s to one own row", async (section, delegate, key) => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          [key]: userId,
          email: "own@example.test",
          weeklyPnlGoal: "0",
          apiKeyEnc: "secret",
          unexpected: "private",
        },
      ]);
    const page = await exportProfilePage(
      { [delegate]: { findMany } } as unknown as PrismaClient,
      userId,
      { section: section as "user" },
    );
    expect(findMany.mock.calls[0][0].where).toEqual({ [key]: userId });
    expect(findMany.mock.calls[0][0].take).toBe(1);
    expect(page.nextCursor).toBeNull();
    expect(JSON.stringify(page)).not.toContain("secret");
    if (section === "user") {
      expect(page.items[0]).toMatchObject({ weeklyPnlGoal: "0" });
      expect(JSON.stringify(page)).not.toContain("private");
      expect(findMany.mock.calls[0][0].select.apiKeyEnc).toBeUndefined();
    }
  });
  it("covers all modules and describes excluded derived data and binary media", () => {
    expect(PROFILE_EXPORT_SECTIONS).toEqual(
      expect.arrayContaining([
        "monthlyGoals",
        "learningPractices",
        "practiceAttachments",
        "practiceFeedback",
        "coachMessages",
        "memoryIdentity",
        "preferences",
        "aiSettings",
      ]),
    );
    expect(PROFILE_EXPORT_SECTIONS).not.toContain("userAiConfig");
    expect(PROFILE_EXPORT_COVERAGE.media).toBe("references-only");
    expect(PROFILE_EXPORT_COVERAGE.exclusions.join(" ")).toContain(
      "TradeStatsCache",
    );
  });
  it("redacts credentials inside legacy JSON strings and nested arrays", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          id: id(1),
          config: [{ token: "secret", apiKeyEnc: "secret", title: "keep" }],
          customTheme: '{"secret":"hidden","accent":"red"}',
        },
      ]);
    const result = await exportProfilePage(
      { customPalette: { findMany } } as unknown as PrismaClient,
      userId,
      { section: "customPalettes" },
    );
    expect(JSON.stringify(result)).not.toMatch(/secret|hidden/);
    expect(result.items[0]).toMatchObject({
      config: [{ title: "keep" }],
      customTheme: '{"accent":"red"}',
    });
  });
});
