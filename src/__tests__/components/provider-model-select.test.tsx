// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProviderModelSelect } from "@/app/perfil/components/provider-model-select";
const m = vi.hoisted(() => ({ error: false, refetch: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    aiConfig: {
      models: {
        useQuery: () => ({
          data: m.error
            ? undefined
            : {
                scope: "account",
                models: [
                  {
                    id: "vendor/free",
                    name: "Modelo Gratis",
                    free: true,
                    supportsTools: true,
                    supportsVision: true,
                    contextLength: 32000,
                  },
                  {
                    id: "vendor/paid",
                    name: "Modelo Premium",
                    free: false,
                    supportsTools: false,
                    supportsVision: false,
                    contextLength: 10000,
                  },
                ],
              },
          error: m.error ? new Error("Unavailable") : null,
          isLoading: false,
          isFetching: false,
          refetch: m.refetch,
        }),
      },
    },
  },
}));
beforeEach(() => {
  m.error = false;
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
function setup(value = "vendor/free", emptyLabel?: string) {
  const change = vi.fn();
  render(
    <ProviderModelSelect
      provider="openrouter"
      label="Modelo por defecto"
      value={value}
      onChange={change}
      emptyLabel={emptyLabel}
      warnTools
    />,
  );
  return change;
}
it("searches the provider catalog and selects a real model", () => {
  const change = setup();
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Buscar modelo por defecto" }),
    { target: { value: "Premium" } },
  );
  expect(
    screen.queryByRole("option", { name: /Modelo Gratis/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: /Modelo Premium/ }));
  expect(change).toHaveBeenCalledWith("vendor/paid");
});
it("supports keyboard selection and Escape without changing the value", async () => {
  const change = setup();
  const trigger = screen.getByRole("combobox", { name: "Modelo por defecto" });
  fireEvent.click(trigger);
  const search = screen.getByRole("textbox", {
    name: "Buscar modelo por defecto",
  });
  fireEvent.change(search, { target: { value: "Premium" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(change).toHaveBeenCalledWith("vendor/paid");
  change.mockClear();
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
  );
  expect(change).not.toHaveBeenCalled();
});
it("keeps an unlisted saved model available and offers explicit manual entry", () => {
  const change = setup("vendor/retired");
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  expect(
    screen.getByRole("option", { name: /vendor\/retired/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Introducir ID manual" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "ID manual: Modelo por defecto" }),
    { target: { value: "vendor/new" } },
  );
  expect(change).toHaveBeenCalledWith("vendor/new");
});
it("allows inherited and automatic values", () => {
  const change = setup("", "Usar predeterminado");
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  expect(
    screen.getByRole("option", { name: "Usar predeterminado" }),
  ).toHaveValue("");
  fireEvent.click(
    screen.getByRole("option", { name: "Automático según prioridad" }),
  );
  expect(change).toHaveBeenCalledWith("auto");
});
it("preserves the selection when the catalog fails and offers retry/manual", () => {
  m.error = true;
  setup("vendor/saved");
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  expect(
    screen.getByRole("option", { name: /vendor\/saved/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar catálogo" }));
  expect(m.refetch).toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Introducir ID manual" }),
  ).toBeEnabled();
});
it("uses declared capabilities instead of treating every free model as tool incapable", () => {
  setup();
  expect(screen.queryByText(/no permite al Coach/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  expect(
    screen.getByRole("option", { name: /Modelo Gratis.*Gratis.*Herramientas/ }),
  ).toBeInTheDocument();
});
it("browses with arrows without committing and cancels with Escape", async () => {
  const change = setup();
  fireEvent.click(screen.getByRole("combobox", { name: "Modelo por defecto" }));
  const search = screen.getByRole("textbox", {
    name: "Buscar modelo por defecto",
  });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  const auto = screen.getByRole("option", {
    name: "Automático según prioridad",
  });
  expect(auto).toHaveFocus();
  fireEvent.keyDown(auto, { key: "ArrowDown" });
  const free = screen.getByRole("option", { name: /Modelo Gratis/ });
  expect(free).toHaveFocus();
  fireEvent.keyDown(free, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: /Modelo Premium/ })).toHaveFocus();
  expect(change).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
  );
  expect(change).not.toHaveBeenCalled();
});
