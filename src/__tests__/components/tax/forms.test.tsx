// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FiscalForm, formatMoney } from "@/app/fiscal/components/fiscal-form";
afterEach(cleanup);
it("formats exact decimal strings without losing precision or inventing zero", () => {
  expect(formatMoney(null)).toBe("Sin calcular");
  expect(formatMoney("9007199254740993.12")).toBe("9,007,199,254,740,993.12");
  expect(formatMoney("0.00")).toBe("0.00");
});
it("preserves decimal input as a string and submits real actions", async () => {
  const save = vi.fn();
  render(
    <FiscalForm
      title="Ingreso"
      userId="u"
      scope="income:new"
      initial={{ grossAmount: "0" }}
      save={save}
    />,
  );
  fireEvent.change(screen.getByLabelText("Importe bruto"), {
    target: { value: "9007199254740993.12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar Ingreso" }));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ grossAmount: "9007199254740993.12" }),
  );
});
it("closed forms cannot save", () => {
  render(
    <FiscalForm
      title="Ingreso"
      userId="u"
      scope="closed"
      initial={{ grossAmount: "0" }}
      disabled
      save={vi.fn()}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "Guardar Ingreso" })
      .hasAttribute("disabled"),
  ).toBe(true);
});
it("offers explicit recovery and excludes RTN from persisted drafts", async () => {
  localStorage.clear();
  const first = render(
    <FiscalForm
      title="perfil"
      userId="private-user"
      scope="profile"
      initial={{ name: "", rtn: "" }}
      save={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByLabelText("RTN (14 dígitos)"), {
    target: { value: "12345678901234" },
  });
  expect(
    localStorage.getItem("tj-draft:v1:private-user:fiscal:profile"),
  ).not.toContain("12345678901234");
  first.unmount();
  render(
    <FiscalForm
      title="perfil"
      userId="private-user"
      scope="profile"
      initial={{ name: "", rtn: "" }}
      save={vi.fn()}
    />,
  );
  expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("");
  fireEvent.click(
    await screen.findByRole("button", { name: "Recuperar borrador" }),
  );
  expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
    "Ana",
  );
  expect(
    (screen.getByLabelText("RTN (14 dígitos)") as HTMLInputElement).value,
  ).toBe("");
});
it("preserves entries after revision conflicts so the user can retry", async () => {
  render(
    <FiscalForm
      title="ingreso"
      userId="u"
      scope="conflict"
      initial={{ grossAmount: "123.45" }}
      save={vi.fn().mockRejectedValue(Error("Conflicto de revisión"))}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar ingreso" }));
  await screen.findByText("Conflicto de revisión");
  expect(
    (screen.getByLabelText("Importe bruto") as HTMLInputElement).value,
  ).toBe("123.45");
});
it("uses Honduras calendar around UTC midnight and keeps out-of-year dates explicit", async () => {
  const { fiscalDate } = await import("@/app/fiscal/components/templates");
  expect(fiscalDate(2026, new Date("2026-11-09T00:30:00Z"))).toBe("2026-11-08");
  expect(fiscalDate(2027, new Date("2027-01-01T01:00:00Z"))).toBe("2027-01-01");
});
it("switches asset identity to token fields without retaining fiat-only keys", () => {
  render(
    <FiscalForm
      title="movimiento"
      userId="u"
      scope="asset-type"
      initial={{ asset: { kind: "FIAT", code: "HNL" } }}
      save={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Tipo"), {
    target: { value: "TOKEN" },
  });
  expect(screen.getByLabelText("Red")).toBeTruthy();
  expect(screen.getByLabelText("Contrato del token")).toBeTruthy();
  expect(screen.queryByLabelText("Código moneda")).toBeNull();
});
it("reuses a request ID for retrying the same payload and changes it with edited inputs", async () => {
  const save = vi.fn().mockRejectedValue(Error("Red interrumpida"));
  render(
    <FiscalForm
      title="intento"
      userId="u"
      scope="attempt"
      initial={{ grossAmount: "1.00" }}
      save={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar intento" }));
  await screen.findByText("Red interrumpida");
  fireEvent.click(screen.getByRole("button", { name: "Guardar intento" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[0][0].requestId).toBe(save.mock.calls[1][0].requestId);
  fireEvent.change(screen.getByLabelText("Importe bruto"), {
    target: { value: "2.00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar intento" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  expect(save.mock.calls[2][0].requestId).not.toBe(
    save.mock.calls[1][0].requestId,
  );
});
it("keeps nested RTN re-entry available after recovering a scrubbed draft", async () => {
  localStorage.clear();
  const initial = {
    information: { accountant: { name: "", rtn: "", registration: "" } },
  };
  const first = render(
    <FiscalForm
      title="contador"
      userId="private-user"
      scope="accountant"
      initial={initial}
      save={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByLabelText("RTN (14 dígitos)"), {
    target: { value: "12345678901234" },
  });
  first.unmount();
  render(
    <FiscalForm
      title="contador"
      userId="private-user"
      scope="accountant"
      initial={initial}
      save={vi.fn()}
    />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Recuperar borrador" }),
  );
  expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
    "Ana",
  );
  expect(
    (screen.getByLabelText("RTN (14 dígitos)") as HTMLInputElement).value,
  ).toBe("");
});
it("does not reuse an older record draft with a newer server revision", async () => {
  localStorage.clear();
  const { RecordEditor } = await import(
    "@/app/fiscal/components/record-editor"
  );
  const props = {
    kind: "credit" as const,
    userId: "u",
    periodId: "p",
    disabled: false,
    choices: {},
    save: vi.fn(),
  };
  const first = render(
    <RecordEditor
      {...props}
      record={{
        id: "credit",
        revision: 4,
        kind: "WITHHOLDING",
        amountHnl: "10.00",
      }}
    />,
  );
  fireEvent.click(screen.getByText("Editar crédito existente · credit"));
  fireEvent.change(screen.getByLabelText("Importe HNL"), {
    target: { value: "11.00" },
  });
  first.rerender(
    <RecordEditor
      {...props}
      record={{
        id: "credit",
        revision: 5,
        kind: "WITHHOLDING",
        amountHnl: "12.00",
      }}
    />,
  );
  expect((screen.getByLabelText("Importe HNL") as HTMLInputElement).value).toBe(
    "12.00",
  );
  expect(
    screen.queryByRole("button", { name: "Recuperar borrador" }),
  ).toBeNull();
});
it("can complete null admitted amounts in saved expenses and credits", async () => {
  const { RecordEditor } = await import("@/app/fiscal/components/record-editor");
  for (const kind of ["deduction", "credit"] as const) {
    const save = vi.fn();
    render(<RecordEditor record={{ id: kind, revision: 1, kind: kind === "credit" ? "WITHHOLDING" : "EXPENSE", amount: "20.00", amountHnl: "20.00", admittedHnl: null }} kind={kind} userId="u" periodId="p" disabled={false} save={save} choices={{}} />);
    fireEvent.click(screen.getByText(`Editar ${kind === "credit" ? "crédito" : "gasto"} existente · ${kind}`));
    fireEvent.change(screen.getByLabelText("Admitido HNL (revisión manual)"), { target: { value: "15.00" } });
    fireEvent.click(screen.getByRole("button", { name: `Guardar ${kind === "credit" ? "crédito" : "gasto"} existente` }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ admittedHnl: "15.00", recordRevision: 1 })));
    cleanup();
  }
});
it("adds an explicit documented valuation to an existing unvalued income", async () => {
  const { RecordEditor } = await import("@/app/fiscal/components/record-editor");
  const save = vi.fn();
  render(<RecordEditor record={{ id: "income", revision: 2, category: "HONORARIOS", payer: "Cliente", assetKind: "FIAT", assetCode: "USD", grossAmount: "100", netAmount: "100", feeAmount: "0", withheldAmount: "0", valuation: null }} kind="income" userId="u" periodId="p" disabled={false} save={save} choices={{ evidenceId: [{ value: "document", label: "Constancia" }] }} />);
  fireEvent.click(screen.getByText("Editar ingreso existente · income"));
  expect(screen.queryByLabelText("Cotización")).toBeNull();
  fireEvent.click(screen.getByLabelText("Agregar o conservar valoración HNL"));
  fireEvent.change(screen.getByLabelText("Cotización"), { target: { value: "25.00" } });
  fireEvent.change(screen.getByLabelText("Fecha y hora ISO de cotización"), { target: { value: "2026-05-01T12:00:00Z" } });
  fireEvent.change(screen.getByLabelText("Fuente"), { target: { value: "Banco" } });
  fireEvent.change(screen.getByLabelText("Documento disponible"), { target: { value: "document" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar ingreso existente" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ valuation: expect.objectContaining({ quantity: "100", base: { kind: "FIAT", code: "USD" }, rate: "25.00", evidenceId: "document" }) })));
});

it('binds a source review to its observed hash and keeps that hash read only', () => {
  render(<FiscalForm title="revisión de origen" userId="u" scope="source-review:new" initial={{recordId:'',kind:'income',reviewedSourceHash:''}} choices={{recordId:[{value:'source-id',label:'Origen de retiro QA',fields:{kind:'source',reviewedSourceHash:'b'.repeat(64)}}]}} save={vi.fn()} />);
  const option = screen.getByRole('option', {name:'Origen de retiro QA'});
  fireEvent.change(option.closest('select')!, {target:{value:'source-id'}});
  const hash = screen.getByLabelText('Huella del origen revisado') as HTMLInputElement;
  expect(hash.value).toBe('b'.repeat(64));
  expect(hash.readOnly).toBe(true);
});
