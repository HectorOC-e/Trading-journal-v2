"use client";
import { useFiscalConfirmation } from "./confirmation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiscalForm, Panel } from "./fiscal-form";
type Evidence = { id: string; name: string; status: string };
async function read(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Error documental");
  return data;
}
export function EvidencePanel({
  userId,
  periodId,
  revision,
  disabled,
  closed = false,
  filingReturns = [],
  uploadBlocked = false,
  refresh,
  records,
}: {
  userId: string;
  periodId: string;
  revision: number;
  disabled: boolean;
  closed?: boolean;
  filingReturns?: { id: string; label: string }[];
  uploadBlocked?: boolean;
  refresh: () => Promise<void>;
  records: Record<string, { id: string }[]>;
}) {
  const { confirm, dialog } = useFiscalConfirmation();
  const [items, setItems] = useState<Evidence[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [file, setFile] = useState<File | null>(null),
    [date, setDate] = useState(""),
    [supersedesId, setSupersedesId] = useState(""),
    [filingReturnId, setFilingReturnId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async (append = false) => {
    try {
      const data = await read(
        await fetch(
          `/api/tax/evidence?periodId=${periodId}${append && cursor ? "&cursor=" + cursor : ""}`,
          { cache: "no-store" },
        ),
      );
      setItems((old) => (append ? [...old, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error documental");
    }
  };
  useEffect(() => {
    let active = true;
    fetch(`/api/tax/evidence?periodId=${periodId}`, { cache: "no-store" })
      .then(read)
      .then((data) => {
        if (active) {
          setItems(data.items);
          setCursor(data.nextCursor);
        }
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : "Error documental");
      });
    return () => {
      active = false;
    };
  }, [periodId]);
  const write = (requestId?: unknown) => ({
    requestId: typeof requestId === "string" ? requestId : crypto.randomUUID(),
    periodId,
    expectedRevision: revision,
  });
  const available = items.filter((item) => item.status === "AVAILABLE");
  return (
    <Panel title="Documentos privados">
      {dialog}
      <p>
        PDF, PNG o JPEG · máximo 4 MiB. Sin envío a IA; archivos y RTN fuera de
        borradores locales.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file || (closed && !filingReturnId)) return;
          setBusy(true);
          try {
            if (
              file.size > 4 * 1024 * 1024 ||
              !["application/pdf", "image/png", "image/jpeg"].includes(
                file.type,
              )
            )
              throw new Error("Selecciona PDF, PNG o JPEG de hasta 4 MiB.");
            const data = new FormData();
            Object.entries(write()).forEach(([k, v]) =>
              data.append(k, String(v)),
            );
            data.append("file", file);
            if (date) data.append("documentDate", date);
            if (closed) data.append("filingReturnId", filingReturnId);
            else if (supersedesId) data.append("supersedesId", supersedesId);
            await read(
              await fetch("/api/tax/evidence", { method: "POST", body: data }),
            );
            setFile(null);
            await refresh();
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Error al subir");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || (closed ? uploadBlocked || filingReturns.length === 0 : disabled)} className="space-y-3">
          {closed && (
            <div className="space-y-1">
              <label htmlFor={`${periodId}:filing-return`} className="block">
                Declaración cerrada del acuse
              </label>
              <select
                id={`${periodId}:filing-return`}
                aria-describedby={`${periodId}:filing-help`}
                value={filingReturnId}
                onChange={(e) => setFilingReturnId(e.target.value)}
                className="w-full p-2 bg-[var(--panel-2)]"
              >
                <option value="">Seleccionar declaración cerrada</option>
                {filingReturns.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <p id={`${periodId}:filing-help`} className="text-xs">
                Este archivo respalda la presentación de una declaración cerrada.
                Después selecciónalo en «Acuse de presentación»; el borrador fiscal se conserva.
              </p>
            </div>
          )}
          <label className="block">
            Archivo
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block">
            Fecha del documento
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {!closed && <label className="block">
            Sustituye documento
            <select
              value={supersedesId}
              onChange={(e) => setSupersedesId(e.target.value)}
              className="w-full p-2 bg-[var(--panel-2)]"
            >
              <option value="">No sustituye</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>}
          <Button type="submit" disabled={!file || (closed && !filingReturnId)} loading={busy}>
            {closed ? "Subir acuse de presentación" : "Subir documento"}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p role="alert">
          {error}
          <Button onClick={() => void load()}>Reintentar documentos</Button>
        </p>
      )}
      <ul className="space-y-3 my-4">
        {items.map((item) => (
          <li
            key={item.id}
            id={item.id}
            className="p-3 border border-[var(--line)] rounded"
          >
            <p>
              {item.name} · {item.status}
            </p>
            <Button
              disabled={item.status !== "AVAILABLE" || busy}
              onClick={async () => {
                try {
                  const data = await read(
                    await fetch("/api/tax/evidence?id=" + item.id, {
                      cache: "no-store",
                    }),
                  );
                  window.open(data.url, "_blank", "noopener,noreferrer");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Error al abrir");
                }
              }}
            >
              Abrir documento
            </Button>
            <Button
              disabled={disabled || busy}
              onClick={async () => {
                if (
                  !(await confirm(
                    "¿Eliminar documento? Puede dejar pendiente la preparación.",
                  ))
                )
                  return;
                setBusy(true);
                try {
                  await read(
                    await fetch("/api/tax/evidence", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...write(), id: item.id }),
                    }),
                  );
                  await refresh();
                  await load();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Error al eliminar",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
      {cursor && (
        <Button onClick={() => void load(true)}>Cargar más documentos</Button>
      )}
      <FiscalForm
        title="vínculo documental"
        userId={userId}
        scope={`${periodId}:evidence-link`}
        initial={{ evidenceId: "", target: "income", targetId: "" }}
        disabled={disabled || busy}
        choices={{
          evidenceId: available.map((item) => ({
            value: item.id,
            label: item.name,
          })),
          targetId: Object.entries(records).flatMap(([kind, rows]) =>
            rows.map((row) => ({
              value: row.id,
              label: `${kind} · ${row.id}`,
            })),
          ),
        }}
        save={async (value) => {
          await read(
            await fetch("/api/tax/evidence", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...value, ...write(value.requestId) }),
            }),
          );
          await refresh();
          await load();
        }}
      />
    </Panel>
  );
}
