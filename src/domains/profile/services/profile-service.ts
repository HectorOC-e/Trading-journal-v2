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
  fxRates:            true,
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
  fxRates?:            Record<string, number>
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

  if (input.fxRates !== undefined) {
    for (const [cur, rate] of Object.entries(input.fxRates)) {
      if (!/^[A-Z]{3}$/.test(cur.toUpperCase())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Código de divisa inválido en tasas FX: "${cur}"` })
      }
      if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `La tasa FX de ${cur} debe ser un número positivo` })
      }
    }
  }
}

/** Returns normalized input (trimmed strings, uppercase currency, sanitized FX rates). */
export function normalizeProfileInput(input: UpdateProfileInput): UpdateProfileInput {
  let fxRates = input.fxRates
  if (fxRates !== undefined) {
    // Uppercase keys, drop USD (always 1) and non-positive values.
    fxRates = Object.fromEntries(
      Object.entries(fxRates)
        .map(([k, v]) => [k.trim().toUpperCase(), v] as const)
        .filter(([k, v]) => k !== "USD" && typeof v === "number" && isFinite(v) && v > 0),
    )
  }
  return {
    ...input,
    name:         input.name?.trim(),
    timezone:     input.timezone?.trim(),
    baseCurrency: input.baseCurrency?.trim().toUpperCase(),
    ...(fxRates !== undefined ? { fxRates } : {}),
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
  if (input.baseCurrency !== undefined || input.timezone !== undefined || input.fxRates !== undefined) {
    await prisma.tradeStatsCache.deleteMany({ where: { userId } })
  }
}
