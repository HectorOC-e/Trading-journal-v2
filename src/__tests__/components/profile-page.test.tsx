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
import PerfilPage from "@/app/perfil/page";
const m = vi.hoisted(() => ({
  profile: {
    id: "qa",
    name: "Original",
    email: "qa@example.com",
    timezone: "UTC",
    language: "es",
    baseCurrency: "USD",
    fxRates: {},
    emailNotifications: true,
    createdAt: "2025-01-01",
    currentStreak: 0,
    bestStreak: 0,
  },
  goals: {
    disciplineGoal: 80,
    weeklyTradesGoal: 10,
    weeklyPnlGoal: 100,
    weeklyGoalMinutes: 300,
    onboardingCompleted: true,
  },
  prefs: { theme: "system", colorScheme: "default" },
  mutate: vi.fn(),
  goalMutate: vi.fn(),
  prefsMutate: vi.fn(),
  success: undefined as
    | undefined
    | ((data: unknown, variables: Record<string, unknown>) => void),
  deletionSuccess: undefined as
    | undefined
    | ((result: {
        ok: boolean;
        status: "completed" | "pending";
      }) => Promise<void> | void),
  logout: vi.fn(),
  invalidate: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/hooks/useLogout", () => ({ useLogout: () => m.logout }));
vi.mock("@/components/layout/top-bar", () => ({ TopBar: () => null }));
vi.mock("@/app/perfil/components/ai-models-card", () => ({
  AiModelsCard: () => null,
}));
vi.mock("@/app/perfil/components/palette-studio", () => ({
  PaletteStudio: () => null,
}));
vi.mock("@/app/perfil/components/learning-reminder-settings", () => ({
  LearningReminderSettings: () => null,
}));
vi.mock("@/lib/use-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/trpc/client", () => {
  const query = (data: () => unknown) => ({
    useQuery: () => ({
      data: data(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  });
  const mutation = (mutate?: unknown) => ({
    useMutation: () => ({ mutate: mutate ?? vi.fn(), isPending: false }),
  });
  const cache = { invalidate: m.invalidate, setData: vi.fn() };
  return {
    trpc: {
      useUtils: () => ({
        profile: { get: cache, exportPage: { fetch: vi.fn() } },
        goals: { get: cache },
        preferences: { get: cache },
        notifications: { preferences: { list: cache } },
        aiConfig: { list: cache, models: cache, diagnostics: cache },
      }),
      profile: {
        get: query(() => m.profile),
        update: {
          useMutation: (options: { onSuccess: typeof m.success }) => {
            m.success = options.onSuccess;
            return { mutate: m.mutate, isPending: false };
          },
        },
        changePassword: mutation(),
        deleteAccount: {
          useMutation: (options: { onSuccess: typeof m.deletionSuccess }) => {
            m.deletionSuccess = options.onSuccess;
            return { mutate: vi.fn(), isPending: false };
          },
        },
      },
      preferences: {
        get: query(() => m.prefs),
        update: mutation(m.prefsMutate),
      },
      goals: { get: query(() => m.goals), set: mutation(m.goalMutate) },
      notifications: {
        preferences: { list: query(() => []), update: mutation() },
        sendTestEmail: mutation(),
      },
      aiConfig: {
        list: query(() => []),
        upsert: mutation(),
        delete: mutation(),
      },
    },
  };
});
const timezoneDescriptor = Object.getOwnPropertyDescriptor(
  Intl,
  "supportedValuesOf",
);
beforeEach(() => {
  // Bound browser catalog fixture: these tests exercise state transitions, not Intl itself.
  Object.defineProperty(Intl, "supportedValuesOf", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ["UTC", "Asia/Tokyo", "Asia/Kathmandu"]),
  });
  sessionStorage.clear();
  vi.clearAllMocks();
  m.profile = {
    ...m.profile,
    name: "Original",
    timezone: "UTC",
    emailNotifications: true,
  };
  m.goals = { ...m.goals, weeklyGoalMinutes: 300 };
});
afterEach(() => {
  cleanup();
  if (timezoneDescriptor)
    Object.defineProperty(Intl, "supportedValuesOf", timezoneDescriptor);
  else Reflect.deleteProperty(Intl, "supportedValuesOf");
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: undefined,
  });
});
it("keeps FX text until save and removes the duplicate learning goal", () => {
  render(<PerfilPage />);
  const fx = screen.getByLabelText("1 EUR = ? USD");
  fireEvent.change(fx, { target: { value: "0." } });
  expect(fx).toHaveValue("0.");
  fireEvent.change(fx, { target: { value: "0,5" } });
  expect(fx).toHaveValue("0,5");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(m.mutate).toHaveBeenCalledWith({ fxRates: { EUR: 0.5 } });
  expect(
    screen.queryByLabelText("Meta semanal (minutos)"),
  ).not.toBeInTheDocument();
});
it("rejects invalid numeric text without sending a save", () => {
  render(<PerfilPage />);
  fireEvent.change(screen.getByLabelText("1 EUR = ? USD"), {
    target: { value: "1foo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Revisa las tasas FX");
  expect(m.mutate).not.toHaveBeenCalled();
});
it("keeps email server-confirmed and personal drafts on unrelated save", () => {
  render(<PerfilPage />);
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
  const master = screen.getByRole("switch", { name: "Email · notificaciones" });
  fireEvent.click(master);
  expect(master).toHaveAttribute("aria-checked", "true");
  expect(m.mutate).toHaveBeenCalledWith({ emailNotifications: false });
  act(() =>
    m.success?.(
      { ...m.profile, emailNotifications: false },
      { emailNotifications: false },
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Datos" }));
  expect(screen.getByLabelText("Nombre")).toHaveValue("Draft");
});
it("preserves drafts on refetch, only patches edited fields, and cancels to latest data", () => {
  const { rerender } = render(<PerfilPage />);
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Draft" },
  });
  m.profile = { ...m.profile, timezone: "Asia/Tokyo" };
  rerender(<PerfilPage />);
  expect(screen.getByLabelText("Nombre")).toHaveValue("Draft");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(m.mutate).toHaveBeenCalledWith({ name: "Draft" });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar cambios" }));
  expect(screen.getByLabelText("Zona horaria")).toHaveValue("Asia/Tokyo");
});
it("recovers drafts on reload and guards beforeunload", async () => {
  const { unmount } = render(<PerfilPage />);
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Recovered" },
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await waitFor(() =>
    expect(sessionStorage.getItem("tj-profile-draft:qa")).toContain(
      "Recovered",
    ),
  );
  unmount();
  render(<PerfilPage />);
  await waitFor(() =>
    expect(screen.getByLabelText("Nombre")).toHaveValue("Recovered"),
  );
  expect(
    screen.getByText("Borrador recuperado. Revísalo antes de guardar."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar cambios" }));
  expect(sessionStorage.getItem("tj-profile-draft:qa")).toBeNull();
});
it("only sends changed goals and preserves zero", () => {
  render(<PerfilPage />);
  fireEvent.click(screen.getByRole("button", { name: "Metas" }));
  fireEvent.change(screen.getByLabelText("Trades por semana"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar metas" }));
  expect(m.goalMutate).toHaveBeenCalledWith({ weeklyTradesGoal: 0 });
});

it("guards same-tab navigation and proceeds only after explicit discard", () => {
  render(<PerfilPage />);
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Draft" },
  });
  const anchor = document.createElement("a");
  anchor.href = "/dashboard";
  anchor.textContent = "Leave profile";
  document.body.appendChild(anchor);
  fireEvent.click(anchor);
  expect(screen.getByRole("dialog")).toHaveTextContent("Cambios sin guardar");
  expect(m.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Descartar y salir" }));
  expect(m.push).toHaveBeenCalledWith("/dashboard");
  expect(sessionStorage.getItem("tj-profile-draft:qa")).toBeNull();
  anchor.remove();
});

it("guards browser Back/Forward through the Navigation API including unsaved secrets", () => {
  const navigation = Object.assign(new EventTarget(), { traverseTo: vi.fn() });
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: navigation,
  });
  render(<PerfilPage />);
  fireEvent.click(screen.getByRole("button", { name: "IA" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]);
  fireEvent.change(screen.getByLabelText("API key de Anthropic (Claude)"), {
    target: { value: "unsaved-secret-key" },
  });
  const event = Object.assign(new Event("navigate", { cancelable: true }), {
    navigationType: "traverse",
    destination: { url: "http://localhost/dashboard", key: "history-key" },
  });
  act(() => {
    navigation.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(true);
  expect(navigation.traverseTo).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("Cambios sin guardar");
  fireEvent.click(screen.getByRole("button", { name: "Descartar y salir" }));
  expect(navigation.traverseTo).toHaveBeenCalledWith("history-key");
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: undefined,
  });
});

it("searches the full browser timezone catalog while retaining a saved legacy value", () => {
  m.profile = { ...m.profile, timezone: "America/Legacy_Zone" };
  render(<PerfilPage />);
  const zone = screen.getByLabelText("Zona horaria");
  expect(zone).toHaveValue("America/Legacy_Zone");
  fireEvent.change(screen.getByLabelText("Buscar zona horaria"), {
    target: { value: "Kathmandu" },
  });
  expect(
    screen.getByRole("option", { name: "Asia/Kathmandu" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Asia/Tokyo" }),
  ).not.toBeInTheDocument();
  expect(zone).toHaveValue("America/Legacy_Zone");
});

it.each(["completed", "pending"] as const)(
  "clears authentication using shared logout after %s account deletion",
  async (status) => {
    render(<PerfilPage />);
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Discarded" },
    });
    expect(sessionStorage.getItem("tj-profile-draft:qa")).toContain(
      "Discarded",
    );
    await act(async () => {
      await m.deletionSuccess?.({ ok: status === "completed", status });
    });
    expect(m.logout).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("tj-profile-draft:qa")).toBeNull();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  },
);
