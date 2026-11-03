// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  PracticeModal,
  type PracticeRecord,
} from "@/app/aprendizaje/modals/practice-modal";
const m = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  get: vi.fn(),
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    learningPractices: {
      create: { useMutation: () => ({ mutateAsync: m.create }) },
      update: { useMutation: () => ({ mutateAsync: m.update }) },
      delete: { useMutation: () => ({ mutateAsync: m.remove }) },
      feedback: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      suggestExercise: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
    useUtils: () => ({ learningPractices: { get: { fetch: m.get } } }),
  },
}));
const record = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Zonas",
  date: "2026-11-03",
  durationMin: 30,
  exercise: "Cinco zonas",
  reflection: "Dudas iniciales",
  resourceId: null,
  version: 1,
  attachments: [],
  feedback: [],
} as unknown as PracticeRecord;
function setup(value: PracticeRecord | null = record) {
  const close = vi.fn();
  const changed = vi.fn();
  render(
    <PracticeModal
      record={value}
      today="2026-11-03"
      onClose={close}
      onChanged={changed}
    />,
  );
  return { close, changed };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ files: [] })),
      ),
  );
  m.update.mockImplementation(async (input) => ({
    ...record,
    ...input,
    version: 2,
  }));
  m.create.mockImplementation(async (input) => ({
    ...record,
    ...input,
    version: 1,
  }));
  m.remove.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("groups save and close in shared footer and submits associated form", async () => {
  setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Nuevas zonas" },
  });
  const actions = screen.getByRole("group", { name: "Acciones de práctica" });
  fireEvent.click(
    within(actions).getByRole("button", { name: "Guardar cambios" }),
  );
  await waitFor(() =>
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Nuevas zonas", expectedVersion: 1 }),
    ),
  );
});
it("renders existing assistant Markdown as semantic bold and lists", () => {
  const p = {
    ...record,
    feedback: [
      {
        id: "f",
        kind: "feedback",
        version: 1,
        text: "**Observación:**\n\n- Una zona\n- Otra zona",
        createdAt: "2026-11-03T12:00:00Z",
      },
    ],
  } as PracticeRecord;
  setup(p);
  expect(screen.getByText("Observación:").tagName).toBe("STRONG");
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.queryByText("**Observación:**")).toBeNull();
});
it("keeps a dirty draft when cancelling close and discards only explicitly", () => {
  const { close } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Borrador conservado" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" }).at(-1)!);
  expect(close).not.toHaveBeenCalled();
  const confirm = screen.getByRole("dialog", {
    name: "¿Descartar los cambios?",
  });
  fireEvent.click(
    within(confirm).getByRole("button", { name: "Seguir editando" }),
  );
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Borrador conservado",
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
  expect(close).toHaveBeenCalledOnce();
});
it("closes untouched new and saved forms without a discard prompt", () => {
  const { close } = setup(null);
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" }).at(-1)!);
  expect(close).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole("dialog", { name: "¿Descartar los cambios?" }),
  ).toBeNull();
});
it("warns before leaving the page with unsaved fields", () => {
  setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Pendiente" },
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
it("does not warn before leaving after saving the draft", async () => {
  const { close } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Guardado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeDisabled(),
  );
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" }).at(-1)!);
  expect(close).toHaveBeenCalledOnce();
});
it("requires confirmation for practice deletion using shared destructive dialog", async () => {
  const { close } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar práctica" }));
  const confirm = screen.getByRole("dialog", {
    name: "¿Eliminar esta práctica?",
  });
  expect(m.remove).not.toHaveBeenCalled();
  fireEvent.click(
    within(confirm).getByRole("button", { name: "Confirmar eliminación" }),
  );
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(m.remove).toHaveBeenCalledWith({ id: record.id, expectedVersion: 1 });
});
it("protects a pending image retry even without unsaved text", async () => {
  m.get.mockRejectedValue(new Error("offline"));
  const { close } = setup();
  fireEvent.change(screen.getByLabelText("Añadir captura"), {
    target: { files: [new File(["image"], "a.png", { type: "image/png" })] },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Reintentar captura" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" }).at(-1)!);
  expect(close).not.toHaveBeenCalled();
  expect(
    screen.getByRole("dialog", { name: "¿Descartar los cambios?" }),
  ).toBeInTheDocument();
});

it("Escape asks before discarding a dirty form", async () => {
  const { close } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Pendiente" },
  });
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(
      screen.getByRole("dialog", { name: "¿Descartar los cambios?" }),
    ).toBeInTheDocument(),
  );
  expect(close).not.toHaveBeenCalled();
});
it("cancelling a new edited practice preserves its fields", () => {
  const { close } = setup(null);
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Nuevo borrador" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Nuevo borrador",
  );
  expect(close).not.toHaveBeenCalled();
});

it("Escape dismisses discard confirmation without losing the draft", async () => {
  const { close } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Borrador" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" }).at(-1)!);
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "¿Descartar los cambios?" }),
    ).toBeNull(),
  );
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Borrador",
  );
  expect(close).not.toHaveBeenCalled();
});
it("closing image preview with Escape preserves the edited parent practice", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          files: [{ id: "img", url: "https://example.com/image.png" }],
        }),
      ),
    ),
  );
  const { close } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Borrador con imagen" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Ampliar captura 1" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Captura de práctica" }),
  ).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Captura de práctica" }),
    ).toBeNull(),
  );
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Borrador con imagen",
  );
  expect(
    screen.queryByRole("dialog", { name: "¿Descartar los cambios?" }),
  ).toBeNull();
  expect(close).not.toHaveBeenCalled();
});

it("saves objective and personal assessment using shared fields", async () => {
  setup();
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Objetivo de esta práctica (opcional)",
    }),
    { target: { value: "Justificar tres zonas" } },
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Autoevaluación (opcional)" }),
    { target: { value: "partial" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() =>
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({
        objective: "Justificar tres zonas",
        assessment: "partial",
      }),
    ),
  );
});
it("repeating opens a clean draft with the profile date and no inherited outcome or minutes", () => {
  render(
    <PracticeModal
      record={null}
      repeatFrom={
        {
          ...record,
          objective: "Tres zonas",
          assessment: "achieved",
        } as PracticeRecord
      }
      today="2026-11-03"
      onClose={vi.fn()}
      onChanged={vi.fn()}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    record.title,
  );
  expect(screen.getByRole("textbox", { name: "Qué hiciste" })).toHaveValue(
    record.exercise,
  );
  expect(
    screen.getByRole("textbox", {
      name: "Objetivo de esta práctica (opcional)",
    }),
  ).toHaveValue("Tres zonas");
  expect(
    screen.getByRole("spinbutton", { name: "Duración (minutos)" }),
  ).toHaveValue(null);
  expect(
    screen.getByRole("combobox", { name: "Autoevaluación (opcional)" }),
  ).toHaveValue("");
  expect(
    screen.getByRole("textbox", {
      name: "Qué aprendiste o qué te costó (opcional)",
    }),
  ).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Ampliar captura 1" }),
  ).not.toBeInTheDocument();
});
it("repeats a saved record only after confirming discard of a dirty draft", () => {
  const repeat = vi.fn();
  render(
    <PracticeModal
      record={record}
      onRepeat={repeat}
      today="2026-11-03"
      onClose={vi.fn()}
      onChanged={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Qué practicaste" }), {
    target: { value: "Cambios locales" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Volver a practicar" }));
  expect(repeat).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(screen.getByRole("textbox", { name: "Qué practicaste" })).toHaveValue(
    "Cambios locales",
  );
  fireEvent.click(screen.getByRole("button", { name: "Volver a practicar" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
  expect(repeat).toHaveBeenCalledWith(record);
});
