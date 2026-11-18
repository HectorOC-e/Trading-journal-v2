// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { PracticesTab } from "@/app/aprendizaje/components/practices-tab";
const modal = vi.hoisted(() => ({ opened: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    learningPractices: {
      list: {
        useInfiniteQuery: () => ({
          data: { pages: [{ items: [], nextCursor: null }] },
          refetch: vi.fn(),
        }),
      },
      summary: {
        useQuery: () => ({
          data: { minutes: 0, sessions: 0, today: "2026-11-03" },
        }),
      },
    },
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    playbook: { validationOverview: { useQuery: () => ({ data: { setup: { id: "550e8400-e29b-41d4-a716-446655440002", name: "Ruptura" } } }) } },
    useUtils: () => ({ learningPractices: { invalidate: vi.fn() } }),
  },
}));
vi.mock("@/app/aprendizaje/modals/practice-modal", () => ({
  PracticeModal: (props: { initialDraft?: { title: string; objective: string; exercise: string; operationalMode: string; kind: string } }) => {
    modal.opened(props);
    return <div role="dialog" aria-label="Registrar práctica"><label>Título<input aria-label="Título" value={props.initialDraft?.title ?? ""} readOnly /></label><label>Objetivo<input aria-label="Objetivo" value={props.initialDraft?.objective ?? ""} readOnly /></label><label>Ejercicio<input aria-label="Ejercicio" value={props.initialDraft?.exercise ?? ""} readOnly /></label><button onClick={() => modal.create()}>Guardar práctica</button></div>;
  },
}));
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/aprendizaje"); });
afterEach(cleanup);
it("offers registering and clearing filters when no practice matches", () => {
  render(<PracticesTab />);
  expect(
    screen.getByRole("button", { name: "Registrar práctica" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Desde"), {
    target: { value: "2026-01-01" },
  });
  expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeTruthy();
  expect(screen.getByText("No hay prácticas con estos filtros.")).toBeTruthy();
});

it("opens an editable validation draft without creating practice data automatically", async () => {
  window.history.replaceState(null, "", "/aprendizaje?tab=practicas&register=1&validationSetup=550e8400-e29b-41d4-a716-446655440002&validationStage=BACKTEST&validationTemplate=sample&mode=BACKTEST");
  render(<PracticesTab initialValidationIntent={{
    setupId: "550e8400-e29b-41d4-a716-446655440002",
    stage: "BACKTEST",
    template: "sample",
  }} />);

  expect(await screen.findByRole("dialog", { name: "Registrar práctica" })).toBeTruthy();
  expect(screen.getByLabelText("Título")).toHaveValue("Validación · Ruptura · Backtesting");
  expect(screen.getByLabelText("Objetivo")).toHaveValue("Ampliar la muestra de Backtesting para evaluar la estrategia con evidencia suficiente.");
  expect(screen.getByLabelText("Ejercicio")).toHaveValue("Registra y revisa nuevos ejemplos de Ruptura en Backtesting; vincula sólo las operaciones realmente practicadas.");
  expect(modal.opened).toHaveBeenCalledWith(expect.objectContaining({ initialDraft: expect.objectContaining({ operationalMode: "BACKTEST", kind: "EXECUTION" }) }));
  expect(modal.create).not.toHaveBeenCalled();
  await waitFor(() => {
    const params = new URLSearchParams(window.location.search);
    expect(params.has("validationSetup")).toBe(false);
    expect(params.has("validationStage")).toBe(false);
    expect(params.has("validationTemplate")).toBe(false);
    expect(params.has("register")).toBe(false);
  });
});
