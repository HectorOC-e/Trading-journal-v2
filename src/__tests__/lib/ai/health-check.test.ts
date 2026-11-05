import { afterEach, expect, it, vi } from "vitest";
import { testProviderConnectivity } from "@/lib/ai/health-check";
afterEach(() => vi.unstubAllGlobals());
it("rejects an invalid OpenRouter credential even when its public models endpoint succeeds", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).endsWith("/auth/key")
        ? new Response(JSON.stringify({ error: { message: "fake-secret" } }), {
            status: 401,
          })
        : new Response(JSON.stringify({ data: [{ id: "public" }] })),
    ),
  );
  const result = await testProviderConnectivity("openrouter", "fake-secret");
  expect(result.valid).toBe(false);
  expect(JSON.stringify(result)).not.toContain("fake-secret");
});
it("validates OpenRouter through authenticated key metadata without inference", async () => {
  const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ data: { label: "key" } })),
  );
  vi.stubGlobal("fetch", f);
  expect(await testProviderConnectivity("openrouter", "fake-secret")).toEqual({
    valid: true,
  });
  expect(f.mock.calls[0][0]).toBe("https://openrouter.ai/api/v1/auth/key");
});
it("does not expose transport exceptions containing credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fake-secret")));
  const result = await testProviderConnectivity("openai", "fake-secret");
  expect(result.valid).toBe(false);
  expect(JSON.stringify(result)).not.toContain("fake-secret");
});
