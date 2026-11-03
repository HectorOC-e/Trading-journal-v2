// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AiModelsCard } from "@/app/perfil/components/ai-models-card";
const m = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    aiSettings: {
      get: {
        useQuery: () => ({
          data: {
            defaultProvider: "openrouter",
            defaultModel: "vendor/current",
            fallbackProvider: "openrouter",
            fallbackModel: "vendor/fallback",
            costPriority: "quality",
            featureModels: {
              trade_analysis: {
                provider: "openrouter",
                model: "vendor/legacy",
              },
              ai_chat: { provider: "openrouter", model: "vendor/coach" },
            },
          },
        }),
      },
      update: { useMutation: () => ({ mutate: m.save, isPending: false }) },
    },
    aiConfig: {
      diagnostics: { useQuery: () => ({ data: undefined }) },
      healthCheck: { useMutation: () => ({ mutate: vi.fn() }) },
      indexStatus: { useQuery: () => ({ data: [] }) },
      reindex: { useMutation: () => ({ mutate: vi.fn() }) },
      models: {
        useQuery: () => ({
          data: {
            scope: "account",
            models: [{ id: "vendor/current", name: "Current" }],
          },
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(),
        }),
      },
    },
    useUtils: () => ({
      aiSettings: { get: { invalidate: m.invalidate } },
      aiConfig: {
        diagnostics: { invalidate: m.invalidate },
        indexStatus: { invalidate: m.invalidate },
      },
    }),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("switching the default provider resets its old model to auto and preserves inactive overrides", async () => {
  render(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Modelo por defecto" }),
    ).toHaveTextContent("Current"),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Proveedor por defecto" }),
    { target: { value: "openai" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar modelos" }));
  expect(m.save).toHaveBeenCalledWith(
    expect.objectContaining({
      defaultProvider: "openai",
      defaultModel: "auto",
      featureModels: expect.objectContaining({
        trade_analysis: { provider: "openrouter", model: "vendor/legacy" },
      }),
    }),
  );
});
it("changing a fallback or feature provider does not retain the previous provider's model", async () => {
  render(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Modelo por defecto" }),
    ).toHaveTextContent("Current"),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Proveedor fallback" }),
    { target: { value: "anthropic" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Modelos por funcionalidad/ }),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Proveedor: Chat / Coach IA" }),
    { target: { value: "openai" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar modelos" }));
  expect(m.save).toHaveBeenCalledWith(
    expect.objectContaining({
      fallbackProvider: null,
      fallbackModel: null,
      featureModels: expect.objectContaining({
        ai_chat: null,
        trade_analysis: { provider: "openrouter", model: "vendor/legacy" },
      }),
    }),
  );
});
