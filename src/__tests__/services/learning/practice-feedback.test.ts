import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { practiceFeedback } from "@/server/services/learning/practice-feedback-service";
vi.mock("@/lib/ai/resolve-provider", () => ({
  resolveAiCall: vi.fn().mockResolvedValue({}),
  usableCandidates: () => [
    { provider: "openrouter", model: "vision", apiKey: "test" },
  ],
}));
vi.mock("@/lib/ai/execute", () => ({
  executeAiCall: async ({
    run,
  }: {
    run: (c: unknown, s: AbortSignal) => unknown;
  }) =>
    run(
      { provider: "openrouter", model: "vision", apiKey: "test" },
      new AbortController().signal,
    ),
}));
function setup() {
  const row = {
    id: "p",
    version: 2,
    title: "Zonas",
    exercise: "5 casos",
    reflection: "Dudas",
    resource: null,
    attachments: [] as { path: string; mime: string }[],
  };
  const p = {
    learningPractice: { findFirst: vi.fn().mockResolvedValue(row) },
    practiceFeedback: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(({ data }) => data),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  p.$transaction.mockImplementation((fn) => fn(p));
  const sb = {
    storage: {
      from: vi
        .fn()
        .mockReturnValue({
          download: vi.fn().mockResolvedValue({ data: new Blob(["image"]) }),
        }),
    },
  };
  return { p, sb, row };
}
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: "Observaciones: faltan reglas." } },
            ],
          }),
        ),
      ),
  ),
);
afterEach(() => vi.unstubAllGlobals());
describe("practice assistant", () => {
  it("rejects another user practice before any provider call", async () => {
    const { p, sb } = setup();
    p.learningPractice.findFirst.mockResolvedValue(null);
    await expect(
      practiceFeedback(p as never, sb as never, "u", {
        id: "p",
        expectedVersion: 2,
        kind: "feedback",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a stale version before provider call", async () => {
    const { p, sb } = setup();
    await expect(
      practiceFeedback(p as never, sb as never, "u", {
        id: "p",
        expectedVersion: 1,
        kind: "feedback",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stores feedback against evaluated version even if changed during request", async () => {
    const { p, sb } = setup();
    const result = await practiceFeedback(p as never, sb as never, "u", {
      id: "p",
      expectedVersion: 2,
      kind: "feedback",
    });
    expect(result).toMatchObject({
      version: 2,
      kind: "feedback",
      text: "Observaciones: faltan reglas.",
    });
  });
  it("sends private image bytes only on explicit feedback request", async () => {
    const { p, sb, row } = setup();
    row.attachments = [{ path: "u/p/image.png", mime: "image/png" }];
    await practiceFeedback(p as never, sb as never, "u", {
      id: "p",
      expectedVersion: 2,
      kind: "feedback",
    });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.messages[1].content[1].image_url.url).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(JSON.stringify(body)).not.toContain("u/p/image.png");
  });
  it("does not send attachments to suggest an exercise", async () => {
    const { p, sb, row } = setup();
    row.attachments = [{ path: "u/p/image.png", mime: "image/png" }];
    await practiceFeedback(p as never, sb as never, "u", {
      id: "p",
      expectedVersion: 2,
      kind: "exercise",
    });
    expect(sb.storage.from).not.toHaveBeenCalled();
  });
  it("returns actionable vision error without storing invented review", async () => {
    const { p, sb, row } = setup();
    row.attachments = [{ path: "u/p/image.png", mime: "image/png" }];
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 400 }));
    await expect(
      practiceFeedback(p as never, sb as never, "u", {
        id: "p",
        expectedVersion: 2,
        kind: "feedback",
      }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(p.practiceFeedback.create).not.toHaveBeenCalled();
  });
  it.each(["edit", "delete"])("rejects evidence %s during a slow response instead of publishing current feedback", async change => {
    const { p, sb, row } = setup();
    const trade = { id:"selected", symbol:"EURUSD", operationalMode:"BACKTEST", date:new Date("2024-01-01"), updatedAt:new Date("2026-11-15") };
    const original = { ...row, tradeLinks: [{ role:"EXECUTED", trade }] };
    const current = { ...original, tradeLinks: change === "delete" ? [] : [{ role:"EXECUTED", trade:{...trade,updatedAt:new Date("2026-11-16")} }] };
    p.learningPractice.findFirst.mockResolvedValueOnce(original).mockResolvedValueOnce(current);
    await expect(practiceFeedback(p as never,sb as never,`race-${change}`,{id:"p",expectedVersion:2,kind:"feedback"})).rejects.toMatchObject({code:"CONFLICT"});
    expect(p.practiceFeedback.create).not.toHaveBeenCalled();
  });
  it("does not silently trim an oversized selection before calling the provider", async()=>{
    const {p,sb,row}=setup();
    p.learningPractice.findFirst.mockResolvedValue({...row,tradeLinks:Array.from({length:51},(_,i)=>({role:"REVIEWED",trade:{id:String(i),symbol:"EURUSD",date:new Date("2024-01-01")}}))});
    await expect(practiceFeedback(p as never,sb as never,"oversized",{id:"p",expectedVersion:2,kind:"feedback"})).rejects.toMatchObject({code:"BAD_REQUEST"});
    expect(fetch).not.toHaveBeenCalled();
  });
});
