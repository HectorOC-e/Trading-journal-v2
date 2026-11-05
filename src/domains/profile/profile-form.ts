/** Parse only at save: typing must retain the user's original text. */
export function parseProfileNumber(
  raw: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))
    throw new Error("Introduce un número válido (punto o coma decimal).");
  const value = Number(text.replace(",", "."));
  if (
    !Number.isFinite(value) ||
    (options.integer && !Number.isInteger(value)) ||
    (options.min != null && value < options.min) ||
    (options.max != null && value > options.max)
  )
    throw new Error("El número está fuera del rango permitido.");
  return value;
}

export type PersonalDraft = {
  name: string;
  timezone: string;
  language: "es" | "en";
  baseCurrency: string;
  fxRates: Record<string, string>;
};
export type GoalsDraft = {
  disciplineGoal: string;
  weeklyTradesGoal: string;
  weeklyPnlGoal: string;
  weeklyGoalMinutesG: string;
};
export function readProfileDraft(
  raw: string | null,
): { personal?: PersonalDraft; goals?: GoalsDraft } | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const value = JSON.parse(raw);
    const personal = value.personal;
    const goals = value.goals;
    if (
      personal &&
      (typeof personal.name !== "string" ||
        typeof personal.timezone !== "string" ||
        !["es", "en"].includes(personal.language) ||
        typeof personal.baseCurrency !== "string" ||
        !personal.fxRates ||
        Array.isArray(personal.fxRates) ||
        typeof personal.fxRates !== "object" ||
        !Object.values(personal.fxRates).every(
          (item) => typeof item === "string",
        ))
    )
      return null;
    if (
      goals &&
      ![
        "disciplineGoal",
        "weeklyTradesGoal",
        "weeklyPnlGoal",
        "weeklyGoalMinutesG",
      ].every((key) => typeof goals[key] === "string")
    )
      return null;
    return {
      personal: personal
        ? {
            name: personal.name,
            timezone: personal.timezone,
            language: personal.language,
            baseCurrency: personal.baseCurrency,
            fxRates: personal.fxRates,
          }
        : undefined,
      goals: goals
        ? {
            disciplineGoal: goals.disciplineGoal,
            weeklyTradesGoal: goals.weeklyTradesGoal,
            weeklyPnlGoal: goals.weeklyPnlGoal,
            weeklyGoalMinutesG: goals.weeklyGoalMinutesG,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}
