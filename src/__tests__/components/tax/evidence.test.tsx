// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EvidencePanel } from "@/app/fiscal/components/evidence-panel";
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({
    ok: true,
    json: async () => ({
      items: [
        { id: "doc", name: "Comprobante.pdf", status: "AVAILABLE" },
        { id: "pending", name: "Pendiente.pdf", status: "UPLOADING" },
      ],
      nextCursor: null,
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  render(
    <EvidencePanel
      userId="u"
      periodId="period"
      revision={8}
      disabled={false}
      refresh={vi.fn().mockResolvedValue(undefined)}
      records={{ income: [{ id: "income" }] }}
    />,
  );
}
it("uploads through authorized multipart with the current revision and no persisted blobs", async () => {
  mount();
  await screen.findByText("Comprobante.pdf · AVAILABLE");
  fireEvent.change(screen.getByLabelText("Archivo"), {
    target: {
      files: [new File(["%PDF-1.7"], "proof.pdf", { type: "application/pdf" })],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Subir documento" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(true),
  );
  const options = fetchMock.mock.calls.find(
    ([, options]) => options?.method === "POST",
  )![1];
  expect(options.body.get("expectedRevision")).toBe("8");
  expect(options.body.get("periodId")).toBe("period");
  expect(options.body.get("file").name).toBe("proof.pdf");
  expect(localStorage.length).toBe(0);
});
it("only offers AVAILABLE documents and links a selected record through PATCH", async () => {
  mount();
  await screen.findByText("Comprobante.pdf · AVAILABLE");
  const select = screen.getByLabelText(
    "Documento disponible",
  ) as HTMLSelectElement;
  expect([...select.options].map((option) => option.value)).toEqual([
    "",
    "doc",
  ]);
  fireEvent.change(select, { target: { value: "doc" } });
  fireEvent.change(screen.getByLabelText("Registro vinculado"), {
    target: { value: "income" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar vínculo documental" }),
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH"),
    ).toBe(true),
  );
  const options = fetchMock.mock.calls.find(
    ([, options]) => options?.method === "PATCH",
  )![1];
  expect(JSON.parse(options.body)).toMatchObject({
    periodId: "period",
    expectedRevision: 8,
    evidenceId: "doc",
    target: "income",
    targetId: "income",
  });
});
it("uploads a filing receipt against a selected closed return while generic mutations stay disabled", async () => {
  render(<EvidencePanel userId="u" periodId="period" revision={8} disabled closed filingReturns={[{ id: "closed-return", label: "Declaración cerrada" }]} uploadBlocked={false} refresh={vi.fn().mockResolvedValue(undefined)} records={{ income: [{ id: "income" }] }} />);
  await screen.findByText("Comprobante.pdf · AVAILABLE");
  fireEvent.change(screen.getByLabelText("Declaración cerrada del acuse"), { target: { value: "closed-return" } });
  fireEvent.change(screen.getByLabelText("Archivo"), { target: { files: [new File(["%PDF-1.7"], "acuse.pdf", { type: "application/pdf" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Subir acuse de presentación" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const options = fetchMock.mock.calls.find(([, options]) => options?.method === "POST")![1];
  expect(options.body.get("filingReturnId")).toBe("closed-return");
  expect(options.body.get("periodId")).toBe("period");
  expect(screen.getByRole("button", { name: "Guardar vínculo documental" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getAllByRole("button", { name: "Eliminar" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
});
