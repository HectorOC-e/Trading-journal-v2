import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { taxRouter } from '@/server/trpc/routers/tax';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function caller(userId: string | null = id(1)) { const prisma = { taxProfile: { findUnique: vi.fn().mockResolvedValue(null) }, taxPeriod: { findFirst: vi.fn().mockResolvedValue({ id: id(2), userId: id(1), year: 2026 }) }, withdrawal: { findMany: vi.fn().mockResolvedValue([]) }, taxImportCandidate: { findMany: vi.fn().mockResolvedValue([]) } }; return { api: taxRouter.createCaller({ prisma, userId, supabase: {} } as any), prisma }; }
describe('authenticated fiscal API', () => {
    it('rejects anonymous profile reads', async () => { const { api } = caller(null); await expect(api.profile.get()).rejects.toMatchObject({ code: 'UNAUTHORIZED' }); });
    it('gets only the authenticated own fiscal profile', async () => { const { api, prisma } = caller(); expect(await api.profile.get()).toBeNull(); expect(prisma.taxProfile.findUnique).toHaveBeenCalledWith({ where: { userId_country: { userId: id(1), country: 'HN' } } }); });
    it('rejects client owner and privileged flags', async () => { const { api } = caller(); await expect(api.periods.list({ userId: id(99) } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' }); await expect(api.transactions.post({ requestId: id(3), periodId: id(2), expectedRevision: 1, id: id(4), recordRevision: 1, allowClosed: true } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' }); });
    it('reads candidates with SELECT-only adapter and without a fiscal mutation', async () => { const { api, prisma } = caller(); expect(await api.imports.candidates({ periodId: id(2) })).toMatchObject({ items: [], nextCursor: null, saved: [] }); expect(prisma.withdrawal.findMany).toHaveBeenCalledOnce(); });
    it('requires the period revision before an economic write', async () => { const { api } = caller(); await expect(api.transactions.post({ requestId: id(3), periodId: id(2), id: id(4), recordRevision: 1 } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' }); });
});
