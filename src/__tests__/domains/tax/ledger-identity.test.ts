import { expect, it } from 'vitest';
import { calculateBalances, validatePostings, assetKey } from '../../../domains/tax/ledger';
const token = { kind: 'TOKEN' as const, symbol: 'USDC', network: 'ethereum', contract: '0xa0b8' };
const alias = { ...token, symbol: 'USD Coin' };
const posting = (asset: typeof token, quantity: string, accountId = 'wallet') => ({ asset, quantity, accountId });
it('aggregates symbol aliases of the same network and contract into one balance', () => {
 const balances = calculateBalances([{type:'EXTERNAL_RECEIPT',postings:[posting(token,'2')]},{type:'EXTERNAL_RECEIPT',postings:[posting(alias,'3')]}]);
 expect(balances).toHaveLength(1);
 expect(balances[0].quantity).toBe('5');
});
it('allows an own transfer using symbol aliases', () => {
 expect(()=>validatePostings({type:'OWN_TRANSFER',postings:[posting(token,'-1','a'),posting(alias,'1','b')]})).not.toThrow();
});
it('rejects conversion between two names for the same token', () => {
 expect(()=>validatePostings({type:'CONVERSION',postings:[posting(token,'-1'),posting(alias,'1')],conversionRate:'1'})).toThrow();
});
it('preserves case-sensitive contract identities on Solana', () => {
 expect(assetKey({...token,network:'solana',contract:'AbC'})).not.toBe(assetKey({...token,network:'solana',contract:'abc'}));
});
it('rejects a balance that accumulates past numeric(38,18) integer precision', () => {
 expect(()=>calculateBalances([{type:'OPENING_BALANCE',postings:[posting(token,'99999999999999999999')]},{type:'OPENING_BALANCE',postings:[posting(token,'99999999999999999999')]}])).toThrow();
});
