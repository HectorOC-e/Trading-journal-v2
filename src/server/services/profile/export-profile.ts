import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  PROFILE_EXPORT_SECTIONS,
  type ProfileExportSection,
} from "@/domains/profile/export-sections";

const delegates = {
  user: "user",
  preferences: "userPreferences",
  aiSettings: "userAiSettings",
  accounts: "account",
  withdrawals: "withdrawal",
  accountLogs: "accountLog",
  setups: "setup",
  setupVersions: "setupVersion",
  trades: "trade",
  tradeEvents: "tradeEvent",
  rules: "rule",
  tags: "tag",
  automations: "automation",
  weeklyReviews: "weeklyReview",
  monthlyReviews: "monthlyReview",
  monthlyGoals: "monthlyGoal",
  learningResources: "learningResource",
  resourceReviews: "resourceReview",
  studySessions: "studySession",
  learningPractices: "learningPractice",
  practiceAttachments: "practiceAttachment",
  practiceFeedback: "practiceFeedback",
  markets: "market",
  checklistResults: "tradeChecklistResult",
  tradingSessionLogs: "tradingSessionLog",
  emailLogs: "emailLog",
  notifications: "notification",
  notificationPreferences: "notificationPreference",
  customPalettes: "customPalette",
  domainEvents: "domainEvent",
  insights: "insight",
  commitments: "commitment",
  commitmentChecks: "commitmentCheck",
  reinforcements: "reinforcement",
  ruleSuggestions: "ruleSuggestion",
  coachThreads: "coachThread",
  coachMessages: "coachMessage",
  coachMemory: "coachMemory",
  interventions: "intervention",
  preSessionCheckins: "preSessionCheckin",
  improvementScores: "improvementScore",
  memoryEpisodes: "memoryEpisode",
  memoryPatterns: "memoryPattern",
  memoryIdentity: "memoryIdentity",
  feedIgnores: "feedIgnore",
  taxProfiles: "taxProfile",
  taxPeriods: "taxPeriod",
  taxAssetAccounts: "taxAssetAccount",
  taxTransactions: "taxTransaction",
  taxPostings: "taxPosting",
  taxIncomes: "taxIncome",
  taxDeductions: "taxDeduction",
  taxCredits: "taxCredit",
  taxImportCandidates: "taxImportCandidate",
  taxReconciliations: "taxReconciliation",
  taxEvidences: "taxEvidence",
  taxReturns: "taxReturn",
  taxAuditEvents: "taxAuditEvent",
  taxIncomeEvidences: "taxIncomeEvidence",
  taxTransactionEvidences: "taxTransactionEvidence",
  taxDeductionEvidences: "taxDeductionEvidence",
  taxCreditEvidences: "taxCreditEvidence",
  taxReturnEvidences: "taxReturnEvidence",

} as const satisfies Record<ProfileExportSection, keyof PrismaClient>;
const userSelect = Object.fromEntries(
  [
    "id",
    "email",
    "name",
    "role",
    "timezone",
    "baseCurrency",
    "fxRates",
    "language",
    "weeklyGoalMinutes",
    "emailNotifications",
    "learningReminderTime",
    "currentStreak",
    "bestStreak",
    "lastReviewDate",
    "weeklyTradesGoal",
    "weeklyPnlGoal",
    "disciplineGoal",
    "onboardingCompleted",
    "dataSharingConsent",
    "createdAt",
    "updatedAt",
  ].map((key) => [key, true]),
);

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
const sensitive =
  /apikey|ciphertext|password|secret|credential|authorization|token|privatekey|encryptionkey|cookie|aiconfig|encrypted/i;
/** Also sanitize arbitrary JSON payloads, which can contain copied provider configuration. */
function jsonSafe(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    // Legacy settings also store JSON as text; keep that representation while removing secrets.
    if (/^\s*[\[{]/.test(value)) {
      try {
        return JSON.stringify(jsonSafe(JSON.parse(value)));
      } catch {
        /* ordinary user text */
      }
    }
    return value;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    if ("toJSON" in value && typeof value.toJSON === "function")
      return jsonSafe(value.toJSON());
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitive.test(key.replace(/[^a-z]/gi, "")))
        .map(([key, child]) => [key, jsonSafe(child)]),
    );
  }
  return null;
}

export async function exportProfilePage(
  prisma: PrismaClient,
  userId: string,
  input: { section: ProfileExportSection; cursor?: string; limit?: number },
) {
  const { section, cursor, limit = 100 } = input;
  if (!(PROFILE_EXPORT_SECTIONS as readonly string[]).includes(section))
    throw new Error("Unknown export section");
  if (
    cursor !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cursor,
    )
  )
    throw new Error("Invalid export cursor");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Export limit must be between 1 and 100");
  const singleton =
    section === "user" ||
    section === "preferences" ||
    section === "memoryIdentity";
  const where: Record<string, unknown> =
    section === "user"
      ? { id: userId }
      : section === "setupVersions"
        ? { setup: { userId } }
        : section === "practiceAttachments" || section === "practiceFeedback"
          ? { practice: { userId } }
          : { userId };
  if (singleton && cursor)
    return { section, items: [] as JsonValue[], nextCursor: null };
  if (cursor) where.id = { gt: cursor };
  // The delegate name comes only from the explicit manifest above, never from user input.
  const delegate = prisma[delegates[section]] as unknown as {
    findMany(args: unknown): Promise<Record<string, unknown>[]>;
  };
  const rows = await delegate.findMany({
    where,
    orderBy: {
      [section === "preferences" || section === "memoryIdentity"
        ? "userId"
        : "id"]: "asc",
    },
    take: singleton ? 1 : limit,
    ...(section === "user"
      ? { select: userSelect }
      : section === "learningResources"
        ? {
            include: {
              linkedSetups: { where: { userId }, select: { id: true } },
            },
          }
        : {}),
  });
  return {
    section,
    items: rows.map((row) =>
      jsonSafe(
        section === "user"
          ? Object.fromEntries(
              Object.entries(row).filter(([key]) => key in userSelect),
            )
          : row,
      ),
    ),
    nextCursor:
      !singleton && rows.length === limit
        ? String(rows[rows.length - 1].id)
        : null,
  };
}
