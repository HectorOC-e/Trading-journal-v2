// ─────────────────────────────────────────────────────────────────────────────
// Procedencia de la emoción del trade (2026-07-27).
//
// Dos cosas que el resto del sistema necesita distinguir y hasta hoy no podía:
// CUÁNDO se registró la emoción, y hasta cuándo se puede seguir registrando.
//
// La marca la deriva SIEMPRE el servidor, por la posición del camino de
// escritura — nunca la declara el cliente. Si el cliente pudiera mandarla, la
// marca no valdría nada: sería una afirmación del mismo sitio del que se
// desconfía.
// ─────────────────────────────────────────────────────────────────────────────

export type EmotionSource = "captured" | "reconstructed"

/**
 * 7 días desde `Trade.date`. Coincide con el ciclo de la review semanal, que es
 * donde el gesto se ofrece (`ensure-analysis.ts` calcula weekStart → +6), así que
 * la ventana y la semana de la review son el mismo objeto. Más allá de una
 * semana, el recuerdo de un trade concreto se disuelve (FREEZE-P3).
 */
export const EMOTION_BACKFILL_WINDOW_DAYS = 7

/**
 * ¿Sigue abierta la casilla para este trade? Se compara a grano de DÍA en UTC:
 * la ventana es un plazo de calendario, no un intervalo de horas, así que operar
 * a las 23:00 no puede dar un día menos de margen que operar a las 09:00.
 */
export function isWithinEmotionWindow(tradeDate: Date, now: Date): boolean {
  const startDay = Date.UTC(tradeDate.getUTCFullYear(), tradeDate.getUTCMonth(), tradeDate.getUTCDate())
  const nowDay   = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days = (nowDay - startDay) / 86_400_000
  return days >= 0 && days <= EMOTION_BACKFILL_WINDOW_DAYS
}
