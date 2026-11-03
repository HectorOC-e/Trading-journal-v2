import { afterEach, expect, it, vi } from "vitest";
import { aiConfigRouter } from "@/server/trpc/routers/ai-config";
import { encryptApiKey } from "@/lib/ai/key-encryption";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("resolves only the authenticated user's encrypted provider key and never returns it", async () => {
  vi.stubEnv("AI_KEY_ENCRYPTION_SECRET", "a".repeat(64));
  const cipher = encryptApiKey("test-secret");
  const findUnique = vi
    .fn()
    .mockResolvedValue({ apiKeyEnc: cipher, isActive: true });
  const f = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "provider/live-model" }] })),
    );
  vi.stubGlobal("fetch", f);
  const c = aiConfigRouter.createCaller({
    userId: "current-user",
    prisma: { userAiConfig: { findUnique } } as never,
    supabase: {} as never,
  });
  const result = await c.models({ provider: "openrouter", purpose: "chat" });
  expect(findUnique).toHaveBeenCalledWith({
    where: {
      userId_provider: { userId: "current-user", provider: "openrouter" },
    },
  });
  expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer test-secret");
  expect(result.scope).toBe("account");
  expect(result.models[0].id).toBe("provider/live-model");
  expect(JSON.stringify(result)).not.toContain(cipher);
  expect(JSON.stringify(result)).not.toContain("test-secret");
});
it("rejects unsupported providers without requesting any upstream URL", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  const c = aiConfigRouter.createCaller({
    userId: "current-user",
    prisma: {} as never,
    supabase: {} as never,
  });
  await expect(
    c.models({ provider: "https://invalid.test" } as never),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(f).not.toHaveBeenCalled();
});
