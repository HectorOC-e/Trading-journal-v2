/** Blank clears a saved Edge value; malformed text must never become a partial number. */
export function parseEdgeNumber(value: string): number | null {
  const text = value.trim().replace(",", ".")
  if (!text) return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) throw new Error("Introduce un número válido")
  return Number(text)
}

type CopyableSetup = {
  name: string; abbreviation: string; market: string; direction: "LONG" | "SHORT" | "AMBAS";
  description: string; color: string; images: string[]; aplusChecklist: string[]; standardChecklist: string[];
  expectedWr?: string | number | null; expectedAvgR?: string | number | null; minR?: string | number | null; maxR?: string | number | null;
}
export function duplicateSetup(setup: CopyableSetup) {
  const numeric = (value: string | number | null | undefined) => value == null ? null : parseEdgeNumber(String(value))
  return { name: setup.name + " (copia)", abbreviation: setup.abbreviation, market: setup.market, direction: setup.direction,
    status: "EN_PRUEBA" as const, description: setup.description, color: setup.color, images: [...setup.images],
    aplusChecklist: [...setup.aplusChecklist], standardChecklist: [...setup.standardChecklist],
    expectedWr: numeric(setup.expectedWr), expectedAvgR: numeric(setup.expectedAvgR), minR: numeric(setup.minR), maxR: numeric(setup.maxR) }
}
export function activeSetupPnl(setups: { id: string; status: string }[], stats: Record<string, { netPnl: number }>) {
  return setups.filter(s => s.status === "ACTIVO").reduce((sum, s) => sum + (stats[s.id]?.netPnl ?? 0), 0)
}
