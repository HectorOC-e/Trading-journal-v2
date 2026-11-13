import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
const mocks = vi.hoisted(() => ({
    user: { id: 'owner' } as {
        id: string;
    } | null, deleted: false, export: vi.fn()
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }));
vi.mock('@/lib/prisma', () => ({ prisma: { accountDeletionJob: { findUnique: async () => mocks.deleted ? { userId: 'owner' } : null } } }));
vi.mock('@/server/services/tax/export-service', () => ({ exportReturn: mocks.export }));
import { GET } from '@/app/api/tax/export/route';
const url = 'https://example.test/api/tax/export?returnId=11111111-1111-4111-8111-111111111111&format=json';
beforeEach(() => { mocks.user = { id: 'owner' }; mocks.deleted = false; mocks.export.mockReset(); mocks.export.mockResolvedValue({
    body: '{"amount":"1.01"}', filename: 'borrador-fiscal-v1.json', contentType: 'application/json'
}); });
describe('private fiscal export route', () => {
    it('requires authentication and refuses a deletion gated owner', async () => { mocks.user = null; expect((await GET(new Request(url))).status).toBe(401); mocks.user = { id: 'owner' }; mocks.deleted = true; expect((await GET(new Request(url))).status).toBe(401); expect(mocks.export).not.toHaveBeenCalled(); });
    it('passes authenticated ownership and never caches downloads', async () => { const r = await GET(new Request(url)); expect(r.status).toBe(200); expect(r.headers.get('Cache-Control')).toContain('no-store'); expect(r.headers.get('Content-Disposition')).toContain('attachment'); expect(mocks.export.mock.calls[0].slice(1)).toEqual(['owner', '11111111-1111-4111-8111-111111111111', 'json']); });
    it('rejects foreign return IDs with no artifact', async () => { mocks.export.mockRejectedValue(new TRPCError({ code: 'NOT_FOUND' })); const r = await GET(new Request(url)); expect(r.status).toBe(404); expect(r.headers.get('Content-Disposition')).toBeNull(); });
    it('returns retryable 503 when PDF rendering is unavailable', async () => { mocks.export.mockRejectedValue(new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'Reintenta PDF' })); const r = await GET(new Request(url.replace('format=json', 'format=pdf'))); expect(r.status).toBe(503); expect(r.headers.get('Retry-After')).toBe('30'); expect(r.headers.get('Cache-Control')).toContain('no-store'); });
    it('rejects unexpected export parameters', async () => { expect((await GET(new Request(url + '&userId=foreign'))).status).toBe(400); expect(mocks.export).not.toHaveBeenCalled(); });
});
