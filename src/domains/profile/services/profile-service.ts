import { TRPCError } from "@trpc/server"
import type { PrismaClient } from "@/lib/generated/prisma/client"

// Explicit whitelist of User fields returned by profile.get.
// Never return all fields — prevents accidental exposure of future sensitive columns.
export const PROFILE_PUBLIC_FIELDS = {
  id:                 true,
  email:              true,
  name:               true,
  role:               true,
  timezone:           true,
  baseCurrency:       true,
  language:           true,
  weeklyGoalMinutes:  true,
  emailNotifications: true,
  currentStreak:      true,
  bestStreak:         true,
  lastReviewDate:     true,
  createdAt:          true,
} as const

export interface UpdateProfileInput {
  name?:               string
  timezone?:           string
  baseCurrency?:       string
  language?:           "es" | "en"
  weeklyGoalMinutes?:  number
  emailNotifications?: boolean
  weeklyTradesGoal?:   number | null
  weeklyPnlGoal?:      number | null
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Throws TRPCError for invalid fields. Call before persisting. */
export function validateProfileUpdate(input: UpdateProfileInput): void {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El nombre no puede estar vacío" })
  }

  if (input.timezone !== undefined && !isValidIanaTimezone(input.timezone)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Timezone inválido: "${input.timezone}". Usa un timezone IANA válido (ej: America/Tegucigalpa, Europe/London)`,
    })
  }

  if (input.baseCurrency !== undefined) {
    const normalized = input.baseCurrency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La moneda debe ser un código de 3 letras (ej: USD, EUR, HNL)",
      })
    }
  }
}

/** Returns normalized input (trimmed strings, uppercase currency). */
export function normalizeProfileInput(input: UpdateProfileInput): UpdateProfileInput {
  return {
    ...input,
    name:         input.name?.trim(),
    timezone:     input.timezone?.trim(),
    baseCurrency: input.baseCurrency?.trim().toUpperCase(),
  }
}

/**
 * Clears analytics cache when currency or timezone changes.
 * Prevents stale metrics from being served for up to 5 minutes post-change.
 */
export async function invalidateAnalyticsCacheIfNeeded(
  prisma: PrismaClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<void> {
  if (input.baseCurrency !== undefined || input.timezone !== undefined) {
    await prisma.tradeStatsCache.deleteMany({ where: { userId } })
  }
}
