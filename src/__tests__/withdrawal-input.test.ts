import { describe, expect, it } from 'vitest'
import { parseWithdrawalAmount, isCalendarDate, formatWithdrawalDate } from '@/lib/withdrawal-input'
describe('withdrawal input', () => {
  it('accepts a complete decimal in either locale without changing its value', () => {
    expect(parseWithdrawalAmount('1,50')).toBe(1.5)
    expect(parseWithdrawalAmount('1000.50')).toBe(1000.5)
  })
  it.each(['1.000,50','1,000.50','100abc','1,000','1.000','0','-1','1e3','Infinity','1.2345'])('rejects ambiguous or invalid amount %s', value => {
    expect(parseWithdrawalAmount(value)).toBeNull()
  })
  it('validates actual calendar dates including leap years', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-11-05junk')).toBe(false)
  })
  it('renders the stored UTC calendar day independent of local timezone', () => {
    expect(formatWithdrawalDate('2026-11-05T00:00:00.000Z')).toContain('05')
    expect(formatWithdrawalDate('2026-11-05T00:00:00.000Z')).toContain('nov')
  })
})
