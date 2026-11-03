"use client";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/server/trpc/root";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type PracticeRecord =
  RouterOutputs["learningPractices"]["list"]["items"][number];
export function PracticeModal({
  record,
  resourceId,
  today,
  onClose,
  onChanged,
}: {
  record: PracticeRecord | null;
  resourceId?: string;
  today?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saved, setSaved] = useState(record);
  const [id] = useState(() => record?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(record?.title ?? "");
  const [date, setDate] = useState(record?.date.slice(0, 10) ?? today ?? "");
  const [minutes, setMinutes] = useState(String(record?.durationMin ?? 30));
  const [exercise, setExercise] = useState(record?.exercise ?? "");
  const [reflection, setReflection] = useState(record?.reflection ?? "");
  const [resource, setResource] = useState(
    record?.resourceId ?? resourceId ?? "",
  );
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const suggest = trpc.learningPractices.suggestExercise.useMutation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const resources = trpc.learningResources.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.learningPractices.create.useMutation(),
    update = trpc.learningPractices.update.useMutation(),
    remove = trpc.learningPractices.delete.useMutation(),
    feedback = trpc.learningPractices.feedback.useMutation();
  const input = {
    title,
    date,
    durationMin: Number(minutes),
    exercise,
    reflection,
    resourceId: resource || null,
  };
  const dirty =
    !saved ||
    JSON.stringify(input) !==
      JSON.stringify({
        title: saved.title,
        date: saved.date.slice(0, 10),
        durationMin: saved.durationMin,
        exercise: saved.exercise,
        reflection: saved.reflection,
        resourceId: saved.resourceId,
      });
  useEffect(() => {
    if (!saved) return;
    let active = true;
    fetch("/api/upload/practice-image?practiceId=" + saved.id, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw Error("No se pudieron cargar las capturas.");
        return r.json();
      })
      .then((d) => {
        if (active) setFiles(d.files);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [saved]);
  async function refresh() {
    const p = await utils.learningPractices.get.fetch({ id });
    setSaved(p);
    onChanged();
    return p;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const p = saved
        ? await update.mutateAsync({
            ...input,
            id,
            expectedVersion: saved.version,
          })
        : await create.mutateAsync({ ...input, id });
      if (!p) throw Error("No se pudo guardar.");
      setSaved(p);
      setTitle(p.title);
      setExercise(p.exercise);
      setReflection(p.reflection);
      onChanged();
      setNotice(
        "Práctica guardada. Puedes añadir capturas o pedir ayuda al asistente.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar. Reintenta.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const f = new FormData();
      f.set("practiceId", id);
      f.set("expectedVersion", String(saved.version));
      f.set("file", file);
      const r = await fetch("/api/upload/practice-image", {
        method: "POST",
        body: f,
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteFile(attachmentId: string) {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/upload/practice-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceId: id,
          expectedVersion: saved.version,
          attachmentId,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }
  async function ask(kind: "exercise" | "feedback") {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      await feedback.mutateAsync({ id, expectedVersion: saved.version, kind });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar. Reintenta.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field =
    "block w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm mt-1";
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl"
        aria-describedby="practice-description"
      >
        <div className="overflow-y-auto p-5 space-y-4">
          <DialogTitle>
            {saved ? "Tu práctica" : "Registrar práctica"}
          </DialogTitle>
          <p id="practice-description" className="text-xs text-[var(--ink-3)]">
            Registra cómo aplicaste lo aprendido. El tiempo de práctica se
            cuenta por separado del estudio.
          </p>
          {!saved && (
            <section className="text-sm">
              <p>
                ¿Necesitas un ejercicio? Escribe el concepto en «Qué
                practicaste» y pide una guía. Registra la sesión después de
                practicar.
              </p>
              <button
                type="button"
                disabled={busy || !title.trim()}
                className="text-[var(--accent)] disabled:opacity-50 mt-2"
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    setSuggestion(
                      (
                        await suggest.mutateAsync({
                          title,
                          resourceId: resource || null,
                        })
                      ).text,
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No se pudo sugerir un ejercicio.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Ayúdame a preparar un ejercicio
              </button>
              {suggestion && (
                <div className="border border-[var(--line)] rounded-lg p-3 mt-2">
                  <p className="whitespace-pre-wrap">{suggestion}</p>
                  <button
                    type="button"
                    onClick={() => setExercise(suggestion)}
                    className="text-[var(--accent)] mt-2"
                  >
                    Usar como guía de la práctica
                  </button>
                  <p className="text-xs mt-1">
                    La guía se conserva al guardar el registro de la práctica.
                  </p>
                </div>
              )}
            </section>
          )}
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm">
              Qué practicaste
              <input
                required
                maxLength={160}
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm min-w-0">
                Fecha
                <input
                  required
                  type="date"
                  max={today}
                  className={field}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="text-sm min-w-0">
                Duración (minutos)
                <input
                  required
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  className={field}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              Recurso relacionado (opcional)
              <select
                className={field}
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                <option value="">Práctica independiente</option>
                {resources.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Qué hiciste
              <textarea
                required
                maxLength={5000}
                rows={3}
                className={field}
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Qué aprendiste o qué te costó (opcional)
              <textarea
                maxLength={5000}
                rows={3}
                className={field}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !dirty}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy
                ? "Procesando…"
                : saved
                  ? "Guardar cambios"
                  : "Guardar práctica"}
            </button>
          </form>
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
          {error && (
            <div role="alert" className="text-sm text-red-600">
              <p>{error}</p>
              {saved && (
                <button
                  className="underline mt-1"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    void refresh().catch(() =>
                      setError("No se pudo actualizar. Reintenta."),
                    );
                  }}
                >
                  Actualizar versión sin borrar el borrador
                </button>
              )}
            </div>
          )}
          {saved && (
            <>
              <section className="border-t border-[var(--line)] pt-3">
                <h3 className="font-semibold text-sm">Capturas</h3>
                <p className="text-xs text-[var(--ink-3)]">
                  Hasta cinco imágenes privadas. PNG, JPEG o WebP; 5 MB por
                  imagen.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {files.map((f, i) => (
                    <div key={f.id}>
                      <button
                        onClick={() => setExpanded(f.url)}
                        className="block w-full"
                      >
                        <img
                          src={f.url}
                          alt={`Captura de práctica ${i + 1}`}
                          className="h-24 w-full object-cover rounded-lg"
                        />
                      </button>
                      <button
                        disabled={busy || dirty}
                        onClick={() => void deleteFile(f.id)}
                        className="text-xs py-1"
                      >
                        Eliminar captura {i + 1}
                      </button>
                    </div>
                  ))}
                </div>
                {saved.attachments.length < 5 && (
                  <label className="block text-sm mt-2">
                    Añadir captura
                    <input
                      aria-label="Añadir captura"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || dirty}
                      className="block text-xs mt-1 max-w-full"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void upload(file);
                      }}
                    />
                  </label>
                )}
              </section>
              <section className="border-t border-[var(--line)] pt-3">
                <h3 className="font-semibold text-sm">Asistente de práctica</h3>
                <p className="text-xs text-[var(--ink-3)]">
                  Usa tu configuración del Coach. Solo se envían notas y, al
                  comentar, capturas cuando lo solicitas.
                </p>
                {dirty && (
                  <p className="text-xs mt-1">
                    Guarda los cambios para añadir capturas o pedir ayuda.
                  </p>
                )}
                <div className="flex flex-wrap gap-3 my-3">
                  <button
                    disabled={busy || dirty}
                    className="text-sm text-[var(--accent)] disabled:opacity-50"
                    onClick={() => void ask("exercise")}
                  >
                    Ayúdame a practicar
                  </button>
                  <button
                    disabled={busy || dirty}
                    className="text-sm text-[var(--accent)] disabled:opacity-50"
                    onClick={() => void ask("feedback")}
                  >
                    Comentar esta práctica
                  </button>
                </div>
                {saved.feedback.map((f) => (
                  <article
                    key={f.id}
                    className="rounded-lg border border-[var(--line)] p-3 my-2"
                  >
                    <p className="text-xs text-[var(--ink-3)]">
                      {f.kind === "exercise"
                        ? "Ejercicio sugerido"
                        : "Comentarios"}{" "}
                      · {new Date(f.createdAt).toLocaleString("es")} ·{" "}
                      {f.version === saved.version
                        ? "Versión actual"
                        : "Sobre una versión anterior"}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm mt-2">
                      {f.text}
                    </p>
                  </article>
                ))}
              </section>
              <div className="border-t border-[var(--line)] pt-3">
                {confirm ? (
                  <div>
                    <p className="text-sm">
                      ¿Eliminar esta práctica, sus capturas y comentarios?
                    </p>
                    <div className="flex gap-4 mt-2">
                      <button
                        disabled={busy}
                        className="text-sm text-red-600"
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            await remove.mutateAsync({
                              id,
                              expectedVersion: saved.version,
                            });
                            onChanged();
                            onClose();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "No se pudo completar. Reintenta.",
                            );
                            setConfirm(false);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Confirmar eliminación
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                        className="text-sm"
                      >
                        Conservar práctica
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={busy}
                    className="text-sm text-red-600"
                    onClick={() => setConfirm(true)}
                  >
                    Eliminar práctica
                  </button>
                )}
              </div>
            </>
          )}
          <button disabled={busy} onClick={onClose} className="text-sm">
            Cerrar
          </button>
        </div>
        {expanded && (
          <Dialog open onOpenChange={() => setExpanded(null)}>
            <DialogContent className="max-w-4xl" aria-describedby={undefined}>
              <DialogTitle className="p-3">Captura de práctica</DialogTitle>
              <img
                src={expanded}
                alt="Captura de práctica ampliada"
                className="max-h-[75dvh] object-contain p-3"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
