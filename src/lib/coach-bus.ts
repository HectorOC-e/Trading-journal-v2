// Tiny client-side bus to open the AI coach with a pre-filled question from
// anywhere in the app (e.g. "explícame esta métrica" buttons on KPI cards).
// The AiCoachDrawer listens for the `coach:ask` event.

export function askCoach(question: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("coach:ask", { detail: { question } }))
}
