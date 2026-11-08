import { describe, it, expect, vi } from "vitest";
import { learningPracticesRouter } from "@/server/trpc/routers/learning-practices";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111";
const input = {
  id,
  title: "Zonas",
  date: "2026-01-01",
  durationMin: 30,
  exercise: "Marcar cinco zonas",
  reflection: "",
  resourceId: null,
};
const row = {
  ...input,
  userId: "u",
  date: new Date("2026-01-01"),
  version: 1,
  updatedAt: new Date(),
  createdAt: new Date(),
  resource: null,
  attachments: [],
  feedback: [],
};
function setup() {
  const p = {
    user: {
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ timezone: "America/Tegucigalpa" }),
    },
    learningResource: { findFirst: vi.fn().mockResolvedValue(null) },
    learningPractice: {
      findFirst: vi.fn().mockResolvedValue(row),
      findFirstOrThrow: vi.fn().mockResolvedValue(row),
      findMany: vi.fn().mockResolvedValue([row]),
      create: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _count: { id: 1 }, _sum: { durationMin: 30 } }),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  p.$transaction.mockImplementation(async (fn) => fn(p));
  return {
    p,
    c: learningPracticesRouter.createCaller({
      prisma: p as never,
      supabase: {} as never,
      userId: "u",
    }),
  };
}
describe("learning practices", () => {
  it("registers independent practice without changing study or trades", async () => {
    const { c, p } = setup();
    p.learningPractice.findFirst.mockResolvedValue(null);
    await c.create(input);
    expect(p.learningPractice.create.mock.calls[0][0].data).toMatchObject({
      userId: "u",
      durationMin: 30,
      resourceId: null,
    });
  });
  it("rejects resource outside own library", async () => {
    const { c, p } = setup();
    await expect(c.create({ ...input, resourceId: id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(p.learningPractice.create).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1441, 1.5])(
    "rejects invalid duration %s",
    async (durationMin) => {
      await expect(
        setup().c.create({ ...input, durationMin }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
  );
  it("rejects future and impossible dates", async () => {
    const { c } = setup();
    for (const date of ["2099-01-01", "2026-02-30"])
      await expect(c.create({ ...input, date })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
  });
  it("rejects editing or deleting another user practice", async () => {
    const { c, p } = setup();
    p.learningPractice.findFirst.mockResolvedValue(null);
    await expect(
      c.update({ ...input, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(c.delete({ id, expectedVersion: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("preserves version conflicts", async () => {
    const { c, p } = setup();
    p.learningPractice.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      c.update({ ...input, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("scopes list to own user and requested dates", async () => {
    const { c, p } = setup();
    await c.list({ limit: 20, from: "2026-01-01", to: "2026-01-31" });
    expect(p.learningPractice.findMany.mock.calls[0][0].where).toMatchObject({
      userId: "u",
      date: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31") },
    });
  });
  it("returns practice weekly totals separately", async () => {
    expect(await setup().c.summary()).toMatchObject({
      minutes: 30,
      sessions: 1,
    });
  });
});

it("persists an optional trimmed practice objective and self assessment", async () => {
  const { c, p } = setup();
  p.learningPractice.findFirst.mockResolvedValue(null);
  await c.create({
    ...input,
    objective: "  Justificar tres zonas  ",
    assessment: "partial",
  });
  expect(p.learningPractice.create.mock.calls[0][0].data).toMatchObject({
    objective: "Justificar tres zonas",
    assessment: "partial",
  });
});
it("rejects unknown assessments and excessive objectives", async () => {
  const { c } = setup();
  await expect(
    c.create({ ...input, assessment: "perfect" } as never),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(
    c.create({ ...input, objective: "x".repeat(1001) }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
});
it("can clear an existing objective and assessment", async () => {
  const { c, p } = setup();
  await c.update({
    ...input,
    expectedVersion: 1,
    objective: "",
    assessment: null,
  });
  expect(p.learningPractice.updateMany.mock.calls[0][0].data).toMatchObject({
    objective: "",
    assessment: null,
  });
});
it('rejects a planned session not owned by the practice author', async () => {
 const {c,p}=setup();p.learningPractice.findFirst.mockResolvedValue(null)
 Object.assign(p,{studySession:{findFirst:vi.fn().mockResolvedValue(null),updateMany:vi.fn()}})
 await expect(c.create({...input,plannedSessionId:id} as never)).rejects.toMatchObject({code:'NOT_FOUND'})
 expect(p.learningPractice.create).not.toHaveBeenCalled()
})
it('atomically completes an owned plan with actual minutes and preserves review source', async () => {
 const {c,p}=setup();p.learningPractice.findFirst.mockResolvedValue(null)
 const reviewSource={kind:'weekly',weekStart:'2025-12-29',conclusion:'Justificar zonas'}
 const updateMany=vi.fn().mockResolvedValue({count:1})
 Object.assign(p,{studySession:{findFirst:vi.fn().mockResolvedValue({id,status:'planned',resourceId:id,reviewSource}),updateMany}})
 p.learningResource.findFirst.mockResolvedValue({id} as never)
 await c.create({...input,resourceId:id,plannedSessionId:id} as never)
 expect(p.learningPractice.create.mock.calls[0][0].data).toMatchObject({plannedSessionId:id,reviewSource})
 expect(updateMany.mock.calls[0][0]).toMatchObject({where:{id,userId:'u',status:'planned'},data:{status:'completed',durationMin:0,startedAt:new Date('2026-01-01T12:00:00Z')}})
})
it('reopens the plan when its actual practice is deleted',async()=>{const {c,p}=setup();p.learningPractice.findFirst.mockResolvedValue({...row,plannedSessionId:id} as never);const updateMany=vi.fn().mockResolvedValue({count:1});Object.assign(p,{studySession:{updateMany}});await c.delete({id,expectedVersion:1});expect(updateMany.mock.calls[0][0]).toMatchObject({where:{id,userId:'u',source:'practice',status:'completed'},data:{status:'planned',durationMin:null,endedAt:null}})})
it('keeps linked completion on the corrected actual practice date without study minutes',async()=>{const {c,p}=setup();p.learningPractice.findFirst.mockResolvedValue({...row,plannedSessionId:id} as never);const updateMany=vi.fn().mockResolvedValue({count:1});Object.assign(p,{studySession:{updateMany}});await c.update({...input,date:'2026-01-02',expectedVersion:1});expect(updateMany.mock.calls[0][0]).toMatchObject({where:{id,userId:'u',source:'practice'},data:{durationMin:0,startedAt:new Date('2026-01-02T12:00:00Z'),endedAt:new Date('2026-01-02T12:00:00Z')}})})
it('copies the source of an owned repeated practice without completing its old plan',async()=>{const {c,p}=setup();const reviewSource={kind:'weekly',weekStart:'2025-12-29',conclusion:'Zonas'};p.learningPractice.findFirst.mockResolvedValueOnce({...row,reviewSource} as never).mockResolvedValueOnce(null);await c.create({...input,repeatFromId:id} as never);expect(p.learningPractice.create.mock.calls[0][0].data).toMatchObject({reviewSource});expect(p.learningPractice.create.mock.calls[0][0].data).not.toHaveProperty('repeatFromId')})
it('rejects a foreign repeated practice and ambiguous repeat/plan input',async()=>{const {c,p}=setup();p.learningPractice.findFirst.mockResolvedValue(null);await expect(c.create({...input,repeatFromId:id} as never)).rejects.toMatchObject({code:'NOT_FOUND'});await expect(c.create({...input,repeatFromId:id,plannedSessionId:id} as never)).rejects.toMatchObject({code:'BAD_REQUEST'})})
