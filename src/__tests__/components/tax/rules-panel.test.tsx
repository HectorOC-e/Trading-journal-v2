// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null as Error | null,
  isPending: false,
  refetch: vi.fn(),
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: { tax: { rules: { status: { useQuery: () => state } } } },
}));
import { RulesPanel } from "@/app/fiscal/components/rules-panel";
beforeEach(() => {
  state.data = {
    year: 2027,
    available: false,
    active: null,
    availableYears: [2026],
    sync: {
      status: "CHECKED",
      lastAttemptAt: "2026-11-13T15:00:00Z",
      lastSuccessAt: "2026-11-13T15:00:00Z",
    },
    updates: [],
    reviewRequired: false,
  };
  state.error = null;
  state.isPending = false;
});
afterEach(cleanup);
it("explains unavailable future-year rules and the automatic check without inventing a table", () => {
  render(
    <RulesPanel year={2027} years={[2026, 2027]} onYearChange={vi.fn()} />,
  );
  expect(screen.getByText(/Reglas ISR 2027 pendientes/)).toBeTruthy();
  expect(screen.getByText(/diariamente/)).toBeTruthy();
  expect(screen.queryByText("240,000.00")).toBeNull();
});
it("shows source failures without claiming a successful new publication", () => {
  state.data = {
    ...(state.data as object),
    sync: { status: "SOURCE_UNAVAILABLE", lastSuccessAt: null },
    reviewRequired: true,
  };
  render(
    <RulesPanel year={2027} years={[2026, 2027]} onYearChange={vi.fn()} />,
  );
  expect(screen.getByText(/No se pudo consultar/)).toBeTruthy();
  expect(screen.getByText(/requiere revisión/)).toBeTruthy();
});
it("changes the rules year explicitly and provides recoverable errors", () => {
  const change = vi.fn();
  render(<RulesPanel year={2027} years={[2026, 2027]} onYearChange={change} />);
  fireEvent.change(screen.getByLabelText("Consultar reglas del ejercicio"), {
    target: { value: "2026" },
  });
  expect(change).toHaveBeenCalledWith(2026);
  cleanup();
  state.error = Error("offline");
  render(<RulesPanel year={2027} years={[2026, 2027]} onYearChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar reglas" }));
  expect(state.refetch).toHaveBeenCalled();
});
