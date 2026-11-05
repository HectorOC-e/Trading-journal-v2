/** No grouping separators: a comma or dot denotes at most two decimal places. */
export function parseWithdrawalAmount(value: string): number | null {
  const text = value.trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const amount = Number(text.replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 && amount <= Number.MAX_SAFE_INTEGER / 100 ? amount : null
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function formatWithdrawalDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
}
