import { afterEach, expect, it, vi } from "vitest";
import { fetchProviderModels } from "@/server/services/ai/provider-model-catalog";
afterEach(() => vi.unstubAllGlobals());
it("uses the account OpenRouter catalog and exposes only safe model metadata", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          {
            id: "vendor/new:free",
            name: "Nuevo",
            context_length: 12345,
            architecture: {
              input_modalities: ["text", "image"],
              output_modalities: ["text"],
            },
            supported_parameters: ["tools"],
            pricing: { prompt: "0", completion: "0" },
            private: "must-not-return",
          },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const models = await fetchProviderModels("openrouter", "test-secret", "chat");
  expect(String(fetcher.mock.calls[0][0])).toBe(
    "https://openrouter.ai/api/v1/models/user?output_modalities=text",
  );
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer test-secret",
  );
  expect(models).toEqual([
    {
      id: "vendor/new:free",
      name: "Nuevo",
      contextLength: 12345,
      supportsTools: true,
      supportsVision: true,
      free: true,
    },
  ]);
  expect(JSON.stringify(models)).not.toContain("test-secret");
  expect(JSON.stringify(models)).not.toContain("must-not-return");
});
it("offers the public OpenRouter catalog without a key and separates embeddings", async () => {
  const f = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          {
            id: "vendor/embed",
            architecture: { output_modalities: ["embeddings"] },
          },
          { id: "vendor/chat", architecture: { output_modalities: ["text"] } },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", f);
  expect(
    (await fetchProviderModels("openrouter", "", "embeddings")).map(
      (m) => m.id,
    ),
  ).toEqual(["vendor/embed"]);
  expect(String(f.mock.calls[0][0])).toBe(
    "https://openrouter.ai/api/v1/models?output_modalities=embeddings",
  );
  expect(f.mock.calls[0][1].headers.Authorization).toBeUndefined();
});
it("paginates Anthropic models and deduplicates IDs", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "claude-first", display_name: "First" }],
          has_more: true,
          last_id: "claude-first",
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "claude-first" }, { id: "claude-second" }],
          has_more: false,
        }),
      ),
    );
  vi.stubGlobal("fetch", f);
  expect(
    (await fetchProviderModels("anthropic", "test-secret", "chat")).map(
      (m) => m.id,
    ),
  ).toEqual(["claude-first", "claude-second"]);
  expect(f.mock.calls[0][1].signal).toBe(f.mock.calls[1][1].signal);
  expect(String(f.mock.calls[1][0])).toContain("after_id=claude-first");
  expect(f.mock.calls[0][1].headers["x-api-key"]).toBe("test-secret");
});
it("does not reflect upstream authentication errors containing secrets", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "test-secret" } }), {
        status: 401,
      }),
    ),
  );
  await expect(
    fetchProviderModels("openrouter", "test-secret", "chat"),
  ).rejects.toThrow(/clave|credenciales/i);
  try {
    await fetchProviderModels("openrouter", "test-secret", "chat");
  } catch (e) {
    expect(String(e)).not.toContain("test-secret");
  }
});
it("filters malformed IDs and preserves unknown capability metadata", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: null },
            { id: "x".repeat(101) },
            { id: "new-model", object: "model" },
            { id: "text-embedding-3-small" },
          ],
        }),
      ),
    ),
  );
  const models = await fetchProviderModels("openai", "test-secret", "chat");
  expect(models.map((m) => m.id)).toEqual(["new-model"]);
  expect(models[0].supportsTools).toBe(null);
});
it("never reflects a credential even in a malformed successful upstream catalog", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "test-secret", name: "Bad" },
            { id: "vendor/bad", name: "Echo test-secret" },
            { id: "vendor/good", name: "Good" },
          ],
        }),
      ),
    ),
  );
  expect(
    (await fetchProviderModels("openrouter", "test-secret", "chat")).map(
      (m) => m.id,
    ),
  ).toEqual(["vendor/good"]);
});
it("fetches later OpenRouter pages without following upstream URLs carrying the credential", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "vendor/one", name: "One" }],
          total_count: 2,
          links: { next: "https://untrusted.invalid/models?offset=1" },
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "vendor/two", name: "Two" }],
          total_count: 2,
          links: { next: null },
        }),
      ),
    );
  vi.stubGlobal("fetch", f);
  expect(
    (await fetchProviderModels("openrouter", "test-secret", "chat")).map(
      (m) => m.id,
    ),
  ).toEqual(["vendor/one", "vendor/two"]);
  expect(String(f.mock.calls[1][0])).toBe(
    "https://openrouter.ai/api/v1/models/user?output_modalities=text&offset=1",
  );
});
