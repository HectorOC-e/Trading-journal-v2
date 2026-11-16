import { TRPCError } from "@trpc/server"
import { operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"

/** Unclassified derived history is never promoted to Real by a compatibility default. */
export function requireDerivedMode(value: unknown, expected?: OperationalMode): OperationalMode {
  const parsed = operationalModeSchema.safeParse(value)
  if (!parsed.success || (expected && parsed.data !== expected)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La modalidad de este registro no está verificada. Regenera su evidencia en la modalidad seleccionada." })
  }
  return parsed.data
}

/** A source-free manual rule is the only explicitly shared rule in this first cut. */
export function rulesForMode(mode: OperationalMode) {
  return { OR: [{ operationalMode: mode }, {
    operationalMode: null, globalManual: true, sourceInsightId: null, sourceCommitmentId: null,
  }] }
}
