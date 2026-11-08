import { describe, it, expect, vi } from 'vitest';
import { incomeSchema, valuedHnl, validateComponents, creditSchema } from '@/server/services/tax/record-service';
import { postingData, transactionInputSchema } from '@/server/services/tax/ledger-service';
import { readWithdrawals, sourceState } from '@/server/services/tax/withdrawal-reader';
import { assertAllocation } from '@/server/services/tax/reconciliation-service';
const asset = { kind: 'FIAT' as const, code: 'HNL' };
describe('fiscal record boundaries', () => {
    it('requires exact gross = net + fee + withheld', () => { expect(() => validateComponents({ grossAmount: '100', netAmount: '90', feeAmount: '5', withheldAmount: '6' })).toThrow(); expect(() => validateComponents({ grossAmount: '100', netAmount: '90', feeAmount: '5', withheldAmount: '5' })).not.toThrow(); });
    it('never silently converts foreign currency or tokens', () => { expect(valuedHnl('100', { kind: 'FIAT', code: 'USD' })).toBeNull(); expect(valuedHnl('100', asset)).toBe('100.00'); });
    it('requires explicit treatment reason and legal basis for admission', () => { expect(incomeSchema.safeParse({ treatment: 'ADMITTED' }).success).toBe(false); });
    it('prevents clients injecting owner or privileged flags', () => { expect(transactionInputSchema.safeParse({ userId: 'x', allowClosed: true }).success).toBe(false); });
    it('retains full token identity in normalized postings', () => { const p = postingData({ accountId: 'a', quantity: '0.123456789012345678', asset: { kind: 'TOKEN', symbol: 'USDC', network: 'Solana', contract: 'AbC' } }); expect(p.assetKey).toBe('["TOKEN","Solana","AbC"]'); expect(p.quantity).toBe('0.123456789012345678'); expect(p.amountHnl).toBeNull(); });
    it('limits credits to unused supported amount', () => { expect(creditSchema.safeParse({ requestId: '00000000-0000-4000-8000-000000000001', periodId: '00000000-0000-4000-8000-000000000002', expectedRevision: 1, kind: 'WITHHOLDING', date: '2026-01-01', amountHnl: '100', previouslyAppliedHnl: '90', admittedHnl: '11', componentKey: 'x' }).success).toBe(false); });
    it('rejects overallocated sources, incomes or receipts and duplicate assignments', () => { expect(() => assertAllocation('100', '40', '61')).toThrow(); expect(() => assertAllocation('100', '40', '60')).not.toThrow(); expect(() => assertAllocation('100', '0', '0')).toThrow(); });
    it('reads only owner real account withdrawals including inactive accounts and prior dates', async () => { const findMany = vi.fn().mockResolvedValue([]); await readWithdrawals({ withdrawal: { findMany } } as any, 'owner', { limit: 10 }); const query = findMany.mock.calls[0][0] as any; expect(query.where.userId).toBe('owner'); expect(query.where.account).toEqual({ userId: 'owner', type: { in: ['PERSONAL', 'PROP_FIRM'] } }); expect(query.where.date).toBeUndefined(); expect(query.where.account.status).toBeUndefined(); });
    it('detects unavailable and changed snapshots', () => { expect(sourceState('a', null)).toBe('UNAVAILABLE'); expect(sourceState('a', { hash: 'b' })).toBe('MODIFIED'); expect(sourceState('a', { hash: 'a' })).toBe('UNCHANGED'); });
});
