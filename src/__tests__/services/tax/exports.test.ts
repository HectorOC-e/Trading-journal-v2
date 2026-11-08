import { describe, expect, it, vi } from 'vitest';
import { csvCell, exportReturn, renderReturnHtml } from '@/server/services/tax/export-service';
const record = {
    id: 'r', version: 1, periodId: 'p', snapshotHash: 'hash', ruleVersion: 'v1', mappingVersion: 'labels', snapshot: {
        notice: 'Borrador / no presentado', sources: { incomes: [{ payer: '=HYPERLINK("evil")', amountHnl: '300000.01' }] }, manifest: [{ id: 'e', sha256: 'abc' }], form: { A: { label: '<img src=x onerror=evil()>' } }
    }
};
describe('fiscal exports', () => {
    it('neutralizes formulas including whitespace and tabs', () => { for (const value of [
        '=1+1', ' +1', '\t@SUM(A1)', '-cmd'
    ])
        expect(csvCell(value)).toMatch(/^"'/); expect(csvCell('normal')).toBe('"normal"'); });
    it('escapes self contained PDF HTML', () => { const html = renderReturnHtml(record as never); expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;img'); expect(html).toContain('no presentado'); });
    it.skipIf(process.env.RUN_TAX_PDF_SMOKE !== '1')('renders an actual PDF with the preinstalled Chromium', async () => { vi.stubEnv('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium'); try {
        const r = await exportReturn({ taxReturn: { findFirst: async () => record } } as never, 'u', 'r', 'pdf');
        expect(Buffer.from(r.body as Uint8Array).subarray(0, 5).toString()).toBe('%PDF-');
    }
    finally {
        vi.unstubAllEnvs();
    } }, 30000);
    it('exports exact decimal snapshots and hashes without DB writes', async () => { const db = { taxReturn: { findFirst: async () => record } }; const result = await exportReturn(db as never, 'u', 'r', 'json'); const json = JSON.parse(result.body as string); expect(json.snapshot.sources.incomes[0].amountHnl).toBe('300000.01'); expect(json.snapshotHash).toBe('hash'); });
    it('rejects inaccessible returns', async () => { await expect(exportReturn({ taxReturn: { findFirst: async () => null } } as never, 'foreign', 'r', 'json')).rejects.toThrow(); });
    it('returns an explicit retryable PDF engine failure', async () => { await expect(exportReturn({ taxReturn: { findFirst: async () => record } } as never, 'u', 'r', 'pdf', async () => { throw Error('engine missing'); })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' }); });
});
