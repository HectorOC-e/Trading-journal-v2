// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PracticeModal } from "@/app/aprendizaje/modals/practice-modal";
import { PracticesTab } from "@/app/aprendizaje/components/practices-tab";
const m = vi.hoisted(() => ({
  summary: undefined as
    | undefined
    | { today: string; timezone: string; minutes: number; sessions: number },
  create: vi.fn(),
  update: vi.fn(),
  profileReady: true,
}));
const record = {
  userId: "draft-user",
  plannedSessionId: null,
  reviewSource: null,
  createdAt: "2026-11-03T12:00:00Z",
  updatedAt: "2026-11-03T12:00:00Z",
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
    profile: { get: { useQuery: () => ({data: m.profileReady ? {id: "draft-user"} : undefined}) } },
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    learningPractices: {
      list: {
        useInfiniteQuery: () => ({ data: { pages: [{ items: [record] }] } }),
      },
      summary: { useQuery: () => ({ data: m.summary }) },
      create: { useMutation: () => ({ mutateAsync: m.create }) },
      update: { useMutation: () => ({ mutateAsync: m.update }) },
      delete: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      feedback: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      suggestExercise: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
    useUtils: () => ({ learningPractices: { invalidate: vi.fn() } }),
  },
}));
beforeEach(() => {
  m.profileReady = true;
  localStorage.clear();
  m.summary = undefined;
  m.create.mockReset();
  m.update.mockReset();
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

it("offers reload recovery and preserves the new practice UUID without auto creation", async () => {
  const props = {record: null, today: "2026-11-03", onClose: vi.fn(), onChanged: vi.fn()};
  const first = render(<PracticeModal {...props} />);
  fireEvent.change(screen.getByRole("textbox", {name: "Qué practicaste"}), {target: {value: "Recuperar"}});
  const key = "tj-draft:v1:draft-user:practice:new:all";
  await waitFor(() => expect(localStorage.getItem(key)).toBeTruthy());
  const id = JSON.parse(localStorage.getItem(key)!).value.id;
  first.unmount();
  render(<PracticeModal {...props} />);
  expect(screen.getByRole("textbox", {name: "Qué practicaste"})).toHaveValue("");
  expect(m.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: "Restaurar borrador"}));
  expect(screen.getByRole("textbox", {name: "Qué practicaste"})).toHaveValue("Recuperar");
  expect(screen.getByRole("textbox", {name: "Qué practicaste"}).id).toContain(id);
});

it("holds the editor until identity resolves and blocks typing while save is pending", async () => {
  m.profileReady = false;
  const props = {record: null, today: "2026-11-03", onClose: vi.fn(), onChanged: vi.fn()};
  const view = render(<PracticeModal {...props} />);
  expect(screen.getByText("Cargando tu perfil…")).toBeTruthy();
  expect(screen.queryByRole("textbox", {name: "Qué practicaste"})).toBeNull();
  expect(localStorage.length).toBe(0);
  m.profileReady = true;
  view.rerender(<PracticeModal {...props} />);
  fireEvent.change(screen.getByRole("textbox", {name: "Qué practicaste"}), {target: {value: "Nueva"}});
  fireEvent.change(screen.getByRole("textbox", {name: "Qué hiciste"}), {target: {value: "Revisar zonas"}});
  m.create.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole("button", {name: "Guardar práctica"}));
  await waitFor(() => expect(m.create).toHaveBeenCalled());
  expect(screen.getByRole("textbox", {name: "Qué practicaste"})).toBeDisabled();
});
it("prefills review planning and locks its resource while preserving the client UUID", async () => {
  const plannedSession = {id: "22222222-2222-4222-8222-222222222222", resourceId: "resource", reviewSource: {kind: "weekly" as const, weekStart: "2026-11-02", conclusion: "Medir paciencia"}};
  render(<PracticeModal record={null} today="2026-11-03" plannedSession={plannedSession} onClose={vi.fn()} onChanged={vi.fn()} />);
  expect(screen.getByRole("textbox", {name: "Qué practicaste"})).toHaveValue("Medir paciencia");
  expect(screen.getByRole("combobox", {name: "Recurso relacionado (opcional)"})).toBeDisabled();
  const id = screen.getByRole("textbox", {name: "Qué practicaste"}).id.replace(/^practice-/, '').replace(/-title$/, '');
  fireEvent.change(screen.getByRole("textbox", {name: "Qué hiciste"}), {target: {value: "Esperar confirmación"}});
  m.create.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole("button", {name: "Guardar práctica"}));
  await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({id, plannedSessionId: plannedSession.id, resourceId: "resource"})));
});

it("moves subsequent edits to the saved record draft and retains the original optimistic version on recovery", async () => {
  let created = record;
  m.create.mockImplementationOnce(async (input) => { created = {...record, ...input, version: 3}; return created; });
  const props = {today: "2026-11-03", onClose: vi.fn(), onChanged: vi.fn()};
  const first = render(<PracticeModal {...props} record={null} />);
  fireEvent.change(screen.getByRole("textbox", {name: "Qué practicaste"}), {target: {value: "Nueva"}});
  fireEvent.change(screen.getByRole("textbox", {name: "Qué hiciste"}), {target: {value: "Zonas"}});
  fireEvent.click(screen.getByRole("button", {name: "Guardar práctica"}));
  await screen.findByRole("button", {name: "Guardar cambios"});
  fireEvent.change(screen.getByRole("textbox", {name: "Qué hiciste"}), {target: {value: "Más zonas"}});
  const key = `tj-draft:v1:draft-user:practice:${created.id}`;
  await waitFor(() => expect(JSON.parse(localStorage.getItem(key)!).value.version).toBe(3));
  first.unmount();
  render(<PracticeModal {...props} record={{...created, version: 4}} />);
  fireEvent.click(screen.getByRole("button", {name: "Restaurar borrador"}));
  m.update.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole("button", {name: "Guardar cambios"}));
  await waitFor(() => expect(m.update).toHaveBeenCalledWith(expect.objectContaining({id: created.id, expectedVersion: 3, exercise: "Más zonas"})));
});
