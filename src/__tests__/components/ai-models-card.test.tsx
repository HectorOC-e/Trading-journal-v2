// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AiModelsCard } from "@/app/perfil/components/ai-models-card";
import { DEFAULT_AI_SETTINGS } from "@/lib/ai/feature-models";
const m = vi.hoisted(() => ({
  data: undefined as unknown,
  error: false,
  refetch: vi.fn(),
  mutate: vi.fn(),
  invalidate: vi.fn(),
  success: undefined as
    | undefined
    | ((data: typeof DEFAULT_AI_SETTINGS) => void),
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      aiSettings: { get: { invalidate: m.invalidate, setData: vi.fn() } },
      aiConfig: {
        diagnostics: { invalidate: m.invalidate },
        indexStatus: { invalidate: m.invalidate },
      },
    }),
    aiSettings: {
      get: {
        useQuery: () => ({
          data: m.data,
          error: m.error ? new Error("Unavailable") : null,
          isLoading: !m.data && !m.error,
          isFetching: false,
          refetch: m.refetch,
        }),
      },
      update: {
        useMutation: (options: {
          onSuccess: (data: typeof DEFAULT_AI_SETTINGS) => void;
        }) => {
          m.success = options.onSuccess;
          return { mutate: m.mutate, isPending: false };
        },
      },
    },
    aiConfig: {
      diagnostics: { useQuery: () => ({}) },
      healthCheck: { useMutation: () => ({ mutate: vi.fn() }) },
      indexStatus: { useQuery: () => ({ data: [] }) },
      reindex: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));
vi.mock("@/app/perfil/components/provider-model-select", () => ({
  ProviderModelSelect: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("@/lib/use-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
beforeEach(() => {
  sessionStorage.clear();
  m.data = undefined;
  m.error = false;
  vi.clearAllMocks();
});
afterEach(cleanup);
it("blocks save before configuration loads and after failure, with retry", () => {
  const { rerender } = render(<AiModelsCard />);
  expect(
    screen.getByRole("button", { name: "Guardar modelos" }),
  ).toBeDisabled();
  m.error = true;
  rerender(<AiModelsCard />);
  expect(
    screen.getByRole("button", { name: "Guardar modelos" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Reintentar cargar modelos" }),
  );
  expect(m.refetch).toHaveBeenCalledOnce();
  expect(m.mutate).not.toHaveBeenCalled();
});
it("keeps drafts on refetch, warns before unload, and cancels to latest confirmed settings", async () => {
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "saved-model" };
  const { rerender } = render(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Modelo por defecto" }),
    ).toHaveValue("saved-model"),
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Modelo por defecto" }),
    { target: { value: "my-draft" } },
  );
  expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "remote-model" };
  rerender(<AiModelsCard />);
  expect(
    screen.getByRole("textbox", { name: "Modelo por defecto" }),
  ).toHaveValue("my-draft");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Cancelar cambios de modelos" }),
  );
  expect(
    screen.getByRole("textbox", { name: "Modelo por defecto" }),
  ).toHaveValue("remote-model");
});
it("refreshes a clean form when server settings change", async () => {
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "first" };
  const { rerender } = render(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Modelo por defecto" }),
    ).toHaveValue("first"),
  );
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "second" };
  rerender(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Modelo por defecto" }),
    ).toHaveValue("second"),
  );
});

it("saves the edited model and clears dirty state only after confirmed success", async () => {
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "saved-model" };
  render(<AiModelsCard />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Modelo por defecto" }),
    ).toHaveValue("saved-model"),
  );
  expect(
    screen.getByRole("button", { name: "Guardar modelos" }),
  ).toBeDisabled();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Modelo por defecto" }),
    { target: { value: "next-model" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar modelos" }));
  expect(m.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ defaultModel: "next-model" }),
  );
  expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  act(() =>
    m.success?.({ ...DEFAULT_AI_SETTINGS, defaultModel: "next-model" }),
  );
  expect(screen.queryByText("Cambios sin guardar")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Guardar modelos" }),
  ).toBeDisabled();
});

it("recovers only model settings scoped to the signed-in user and removes the draft on cancel", async () => {
  m.data = { ...DEFAULT_AI_SETTINGS, defaultModel: "saved-model" };
  const key = "tj-profile-models-draft:qa-user";
  sessionStorage.setItem(
    key,
    JSON.stringify({ ...DEFAULT_AI_SETTINGS, defaultModel: "recovered-model" }),
  );
  render(<AiModelsCard userId="qa-user" />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Modelo por defecto" }),
    ).toHaveValue("recovered-model"),
  );
  expect(
    screen.getByText(
      "Borrador de modelos recuperado. Revísalo antes de guardar.",
    ),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Cancelar cambios de modelos" }),
  );
  expect(
    screen.getByRole("textbox", { name: "Modelo por defecto" }),
  ).toHaveValue("saved-model");
  expect(sessionStorage.getItem(key)).toBeNull();
});
