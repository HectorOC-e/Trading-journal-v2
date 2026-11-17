import { describe, expect, it, vi } from 'vitest';
import { replacePracticeTradeLinks } from '@/server/services/learning/practice-trades-service';

function database(mode = 'BACKTEST', kind = 'EXECUTION') {
  const practice = { id: 'p', userId: 'u', version: 1, operationalMode: mode, kind };
  const links: Array<{ userId: string; practiceId: string; tradeId: string; role: string }> = [];
  const tx = {
    $queryRaw: vi.fn(),
    learningPractice: { findFirst: vi.fn(async () => practice), updateMany: vi.fn(async ({ where, data }: any) => { if (where.version !== practice.version) return {count:0}; practice.version += data.version?.increment ?? 0; return { count: 1 }; }) },
    trade: { findMany: vi.fn(async ({ where }: any) => ['a','b','c'].filter(id => where.id.in.includes(id)).map(id => ({ id, userId: 'u', operationalMode: mode }))) },
    practiceTradeLink: { findFirst: vi.fn(async () => null), deleteMany: vi.fn(async () => { practice.version += links.length; links.length = 0; }), createMany: vi.fn(async ({ data }: any) => { links.push(...data); practice.version += data.length; }) },
  };
  return { prisma: { ...tx, $transaction: (fn: any) => fn(tx) } as any, tx, practice, links };
}

describe('practice links', () => {
  it('links three existing backtests once without copying trades or adding minutes', async () => {
    const db = database();
    expect(await replacePracticeTradeLinks(db.prisma, 'u', { practiceId: 'p', expectedVersion: 1, links: ['a','b','c'].map(tradeId => ({tradeId,role:'EXECUTED'})) })).toEqual({ version: 4, linkedTradeCount: 3 });
    expect(db.links.map(l=>l.tradeId)).toEqual(['a','b','c']);
    expect(db.practice).not.toHaveProperty('durationMin');
  });
  it('rejects mixed modes and foreign or missing trades', async () => {
    const db = database();
    db.tx.trade.findMany.mockResolvedValueOnce([{ id:'a', userId:'u',operationalMode:'DEMO' }]);
    await expect(replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[{tradeId:'a',role:'EXECUTED'}]})).rejects.toMatchObject({code:'BAD_REQUEST'});
    await expect(replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[{tradeId:'foreign',role:'EXECUTED'}]})).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('allows real evidence only as a review', async () => {
    const db = database('REAL','REVIEW');
    await expect(replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[{tradeId:'a',role:'EXECUTED'}]})).rejects.toMatchObject({code:'BAD_REQUEST'});
    expect(await replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[{tradeId:'a',role:'REVIEWED'}]})).toMatchObject({linkedTradeCount:1});
  });
  it('rejects a second execution and stale versions', async () => {
    const db = database();
    db.tx.practiceTradeLink.findFirst.mockResolvedValueOnce({practiceId:'other'} as any);
    await expect(replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[{tradeId:'a',role:'EXECUTED'}]})).rejects.toMatchObject({code:'CONFLICT'});
    await expect(replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:0,links:[]})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('keeps concept practices valid without trades', async () => {
    const db = database(null as any,'CONCEPT');
    expect(await replacePracticeTradeLinks(db.prisma,'u',{practiceId:'p',expectedVersion:1,links:[]})).toMatchObject({ linkedTradeCount:0 });
  });
});
