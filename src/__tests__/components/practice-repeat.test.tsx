// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PracticesTab } from "@/app/aprendizaje/components/practices-tab";
const m = vi.hoisted(() => ({
  summary: undefined as
    | undefined
    | { today: string; timezone: string; minutes: number; sessions: number },
  create: vi.fn(),
}));
const record = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Zonas",
  date: "2026-11-01",
  durationMin: 50,
  exercise: "Marcar zonas",
  reflection: "Anterior",
  objective: "Tres zonas",
  assessment: "achieved",
  resourceId: null,
  resource: null,
  version: 1,
  attachments: [],
  feedback: [],
};
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    learningPractices: {
      list: {
        useInfiniteQuery: () => ({ data: { pages: [{ items: [record] }] } }),
      },
      summary: { useQuery: () => ({ data: m.summary }) },
      create: { useMutation: () => ({ mutateAsync: m.create }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      delete: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      feedback: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      suggestExercise: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
    useUtils: () => ({ learningPractices: { invalidate: vi.fn() } }),
  },
}));
beforeEach(() => {
  m.summary = undefined;
  m.create.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ files: [] }))),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("waits for the profile calendar before opening a new attempt and never saves automatically", async () => {
  const view = render(<PracticesTab />);
  fireEvent.click(screen.getByRole("button", { name: /Zonas/ }));
  const oldId = screen.getByRole("textbox", { name: "Qué practicaste" }).id;
  fireEvent.click(screen.getByRole("button", { name: "Volver a practicar" }));
  expect(
    screen.queryByRole("dialog", { name: "Registrar práctica" }),
  ).not.toBeInTheDocument();
  m.summary = {
    today: "2026-11-03",
    timezone: "America/Tegucigalpa",
    minutes: 50,
    sessions: 1,
  };
  view.rerender(<PracticesTab />);
  await waitFor(() =>
    expect(
      screen.getByRole("dialog", { name: "Registrar práctica" }),
    ).toBeVisible(),
  );
  expect(screen.getByLabelText(/Fecha/)).toHaveValue("2026-11-03");
  expect(screen.getByRole("textbox", { name: "Qué practicaste" }).id).not.toBe(
    oldId,
  );
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Zonas",
  );
  expect(
    screen.getByRole("spinbutton", { name: "Duración (minutos)" }),
  ).toHaveValue(null);
  expect(
    screen.getByRole("combobox", { name: "Autoevaluación (opcional)" }),
  ).toHaveValue("");
  expect(m.create).not.toHaveBeenCalled();
});
