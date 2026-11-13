// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  mutate: vi.fn().mockResolvedValue({}),
  pending: false,
  error: null as null | Error,
}));
vi.mock("@/lib/trpc/client", () => {
  const node = (path: string[]): unknown =>
    new Proxy(() => {}, {
      get: (_, key) =>
        key === "useQuery"
          ? () => ({
              data: state.data[path.join(".")],
              isPending: state.pending,
              error: state.error,
              refetch: vi.fn().mockResolvedValue({}),
            })
          : key === "useMutation"
            ? () => ({
                mutateAsync: (input: unknown) =>
                  state.mutate(path.join("."), input),
                isPending: false,
                error: null,
              })
            : node([...path, String(key)]),
    });
  return { trpc: node([]) };
});
import { fiscalDate } from "@/app/fiscal/components/templates";
import { FiscalWorkspace } from "@/app/fiscal/components/fiscal-workspace";
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FiscalWorkspace />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  state.mutate.mockClear();
  state.pending = false;
  state.error = null;
  state.data = {
    "profile.get": { id: "user-a" },
    "tax.profile.get": { id: "profile", name: "Ana", rtn: "", revision: 1 },
    "tax.periods.list": {
      items: [{ id: "period", year: 2026, status: "OPEN" }],
    },
    "tax.periods.get": {
      id: "period",
      year: 2026,
      status: "OPEN",
      revision: 7,
    },
    "tax.overview": { receivedHnl: null, valuationComplete: false },
    "tax.accounts.list": { items: [] },
    "tax.incomes.list": { items: [] },
    "tax.transactions.list": {
      items: [
        {
          id: "draft-tx",
          kind: "OPENING_BALANCE",
          status: "DRAFT",
          revision: 2,
          date: "2026-01-01",
        },
      ],
    },
    "tax.deductions.list": { items: [] },
    "tax.credits.list": { items: [] },
    "tax.imports.candidates": { items: [], saved: [] },
    "tax.calculations.preview": {
      status: "DRAFT",
      calculation: null,
      pending: ["Valoración pendiente"],
    },
    "tax.returns.list": { items: [] },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], nextCursor: null }),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows loading and recoverable query error", () => {
  state.pending = true;
  const view = (() => {
    mount();
    return screen.getByRole("status");
  })();
  expect(view.textContent).toContain("Cargando");
  cleanup();
  state.pending = false;
  state.error = Error("offline");
  mount();
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
});
it("distinguishes unknown amounts from zero and calls post with current revision", async () => {
  mount();
  expect(screen.getByText("Sin calcular")).toBeTruthy();
  expect(screen.getByText(/Cobertura parcial/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Movimientos" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Contabilizar draft-tx" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.transactions.post",
      expect.objectContaining({
        periodId: "period",
        expectedRevision: 7,
        id: "draft-tx",
        recordRevision: 2,
      }),
    ),
  );
});
it("income form keeps large decimals exact and separates recognition", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Ingresos" }));
  fireEvent.change(screen.getByLabelText("Importe bruto"), {
    target: { value: "9007199254740993.12" },
  });
  fireEvent.change(screen.getByLabelText("Importe neto"), {
    target: { value: "9007199254740993.12" },
  });
  fireEvent.change(screen.getByLabelText("Criterio de reconocimiento"), {
    target: { value: "Devengo documentado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar ingreso" }));
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.incomes.save",
      expect.objectContaining({
        grossAmount: "9007199254740993.12",
        netAmount: "9007199254740993.12",
        expectedRevision: 7,
        recognition: expect.objectContaining({
          criterion: "Devengo documentado",
          recognitionDate: fiscalDate(2026),
        }),
      }),
    ),
  );
});
it("wires prepare and preserves pending coverage", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "ISR y declaración" }));
  expect(screen.getByText("Valoración pendiente")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Preparar borrador 102" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.returns.prepare",
      expect.objectContaining({ periodId: "period", expectedRevision: 7 }),
    ),
  );
});
it("edits an existing income with its revision and exact quantities", async () => {
  const id = "10000000-0000-4000-8000-000000000001";
  state.data["tax.incomes.list"] = {
    items: [
      {
        id,
        revision: 4,
        category: "HONORARIOS",
        payer: "Cliente",
        description: "",
        recognitionDate: "2026-04-03",
        recognitionCriterion: "Devengo",
        recognitionStatus: "PENDING",
        recognitionLegalBasis: "",
        assetKind: "FIAT",
        assetCode: "HNL",
        grossAmount: "9007199254740993.12",
        netAmount: "9007199254740993.12",
        feeAmount: "0",
        withheldAmount: "0",
        treatment: "PENDING",
        treatmentReason: "",
        legalReference: "",
        evidenceRequired: true,
      },
    ],
  };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Ingresos" }));
  fireEvent.click(screen.getByText(`Editar ingreso existente · ${id}`));
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar ingreso existente" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.incomes.save",
      expect.objectContaining({
        id,
        recordRevision: 4,
        expectedRevision: 7,
        grossAmount: "9007199254740993.12",
        recognition: expect.objectContaining({ recognitionDate: "2026-04-03" }),
      }),
    ),
  );
});
it("requires an accessible confirmation before closing the selected snapshot", async () => {
  state.data["tax.returns.list"] = {
    items: [
      {
        id: "10000000-0000-4000-8000-000000000002",
        status: "READY",
        snapshot: {},
      },
    ],
  };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "ISR y declaración" }));
  fireEvent.click(screen.getByRole("button", { name: "Cerrar ejercicio" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(state.mutate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.returns.close",
      expect.objectContaining({
        returnId: "10000000-0000-4000-8000-000000000002",
        expectedRevision: 7,
      }),
    ),
  );
});
it("links existing income and receipt with source hash and revisions selected from actual rows", async () => {
  const incomeId = "20000000-0000-4000-8000-000000000001",
    receiptId = "20000000-0000-4000-8000-000000000002",
    sourceId = "20000000-0000-4000-8000-000000000003",
    hash = "a".repeat(64);
  state.data["tax.incomes.list"] = {
    items: [
      { id: incomeId, payer: "Cliente", grossAmount: "100", revision: 3 },
    ],
  };
  state.data["tax.transactions.list"] = {
    items: [
      {
        id: receiptId,
        date: "2026-05-01",
        kind: "EXTERNAL_RECEIPT",
        revision: 5,
        status: "POSTED",
        reversalOfId: null,
      },
    ],
  };
  state.data["tax.imports.candidates"] = {
    items: [
      {
        sourceId,
        hash,
        sourceState: "NEW",
        snapshot: { amount: "100", currency: "HNL", status: "PAGADO" },
      },
    ],
    saved: [],
  };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Retiros" }));
  const form = screen
    .getByRole("button", { name: "Guardar conciliación vinculada" })
    .closest("form")!;
  const view = within(form);
  fireEvent.change(view.getByLabelText("Ingreso"), {
    target: { value: incomeId },
  });
  fireEvent.change(view.getByLabelText("Movimiento"), {
    target: { value: receiptId },
  });
  fireEvent.change(view.getByLabelText("Retiro propuesto"), {
    target: { value: sourceId },
  });
  fireEvent.change(view.getByLabelText("Importe bruto"), {
    target: { value: "100" },
  });
  fireEvent.change(view.getByLabelText("Importe neto"), {
    target: { value: "100" },
  });
  fireEvent.change(view.getByLabelText("Importe asignado de la fuente"), {
    target: { value: "100" },
  });
  fireEvent.change(view.getByLabelText("Referencia del comprobante"), {
    target: { value: "Transferencia recibida" },
  });
  fireEvent.change(view.getByLabelText("Motivo"), {
    target: { value: "Conciliación documentada" },
  });
  fireEvent.click(view.getByLabelText("Recepción confirmada"));
  fireEvent.click(
    view.getByRole("button", { name: "Guardar conciliación vinculada" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.imports.reconcile",
      expect.objectContaining({
        incomeId,
        incomeRevision: 3,
        transactionId: receiptId,
        transactionRevision: 5,
        receiptConfirmed: true,
        allocations: [
          expect.objectContaining({
            sourceId,
            sourceHash: hash,
            sourceAmount: "100",
            grossAmount: "100",
            netAmount: "100",
          }),
        ],
      }),
    ),
  );
});
it("discards only a draft through an explicit documented confirmation", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Movimientos" }));
  const form = screen
    .getByRole("button", { name: "Guardar descarte de movimiento" })
    .closest("form")!;
  fireEvent.change(within(form).getByLabelText("Motivo"), {
    target: { value: "Borrador duplicado sin contabilizar" },
  });
  fireEvent.click(
    within(form).getByRole("button", {
      name: "Guardar descarte de movimiento",
    }),
  );
  expect(state.mutate).not.toHaveBeenCalledWith(
    "tax.transactions.discard",
    expect.anything(),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.transactions.discard",
      expect.objectContaining({
        id: "draft-tx",
        recordRevision: 2,
        expectedRevision: 7,
        reason: "Borrador duplicado sin contabilizar",
      }),
    ),
  );
});
it("submits documentary transaction reviews and related records through structured controls", async () => {
  const incomeId = "20000000-0000-4000-8000-000000000001";
  state.data["tax.incomes.list"] = {
    items: [
      { id: incomeId, payer: "Cliente", grossAmount: "100.00", revision: 3 },
    ],
  };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "ISR y declaración" }));
  const form = screen
    .getByRole("button", { name: "Guardar información del ejercicio" })
    .closest("form")!;
  const view = within(form);
  fireEvent.change(view.getByLabelText("Registro revisado"), {
    target: { value: "draft-tx" },
  });
  fireEvent.change(view.getByLabelText("Método"), {
    target: {
      value: "Conciliación del importe realizado y el ingreso admitido",
    },
  });
  fireEvent.change(view.getByLabelText("Casilla formulario 102"), {
    target: { value: "Otros ingresos gravables" },
  });
  const related = view.getByLabelText(
    "Registros económicos relacionados",
  ) as HTMLSelectElement;
  const option = Array.from(related.options).find(
    (item) => item.value === incomeId,
  )!;
  option.selected = true;
  fireEvent.change(related);
  fireEvent.click(
    view.getByRole("button", { name: "Guardar información del ejercicio" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.periods.updateInformation",
      expect.objectContaining({
        information: expect.objectContaining({
          reviews: [
            expect.objectContaining({
              recordId: "draft-tx",
              kind: "transaction",
              method:
                "Conciliación del importe realizado y el ingreso admitido",
              mappingLabel: "Otros ingresos gravables",
              relatedRecordIds: [incomeId],
            }),
          ],
        }),
      }),
    ),
  );
});
it("allows correcting an existing expense and credit with their original revisions", async () => {
  state.data["tax.deductions.list"] = {
    items: [
      {
        id: "expense",
        revision: 4,
        kind: "EXPENSE",
        category: "Comisión",
        description: "",
        date: "2026-01-04",
        assetKind: "FIAT",
        assetCode: "HNL",
        amount: "20.00",
        treatment: "PENDING",
        componentKey: "fee-1",
      },
    ],
  };
  state.data["tax.credits.list"] = {
    items: [
      {
        id: "credit",
        revision: 5,
        kind: "WITHHOLDING",
        payer: "Empresa",
        date: "2026-01-04",
        reference: "constancia",
        amountHnl: "30.00",
        previouslyAppliedHnl: "0.00",
        treatment: "PENDING",
        componentKey: "withholding-1",
      },
    ],
  };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Gastos y créditos" }));
  fireEvent.click(screen.getByText("Editar gasto existente · expense"));
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar gasto existente" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.deductions.save",
      expect.objectContaining({
        id: "expense",
        recordRevision: 4,
        amount: "20.00",
        expectedRevision: 7,
      }),
    ),
  );
  fireEvent.click(screen.getByText("Editar crédito existente · credit"));
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar crédito existente" }),
  );
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith(
      "tax.credits.save",
      expect.objectContaining({
        id: "credit",
        recordRevision: 5,
        amountHnl: "30.00",
        expectedRevision: 7,
      }),
    ),
  );
});

it("offers an archived READY return for post-close filing receipt upload", async () => {
  state.data["tax.periods.get"] = { id: "period", year: 2026, status: "CLOSED", revision: 9 };
  state.data["tax.returns.list"] = { items: [{ id: "closed-return", status: "READY", closedAt: "2026-11-08T12:00:00Z", version: 1 }] };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Documentos", exact: true }));
  expect(await screen.findByRole("option", { name: "Declaración closed-return" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Subir acuse de presentación" })).toBeTruthy();
});

it("keeps archived returns fileable after reopening and disables their close action", () => {
  state.data["tax.returns.list"] = { items: [{ id: "closed-return", status: "READY", closedAt: "2026-11-08T12:00:00Z", version: 1 }] };
  mount();
  fireEvent.click(screen.getByRole("button", { name: "ISR y declaración", exact: true }));
  expect(screen.getByRole("button", { name: "Guardar acuse de presentación" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("button", { name: "Cerrar ejercicio", exact: true }).hasAttribute("disabled")).toBe(true);
});
