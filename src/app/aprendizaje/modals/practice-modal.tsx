"use client";
import { useRecoverableDraft } from "@/hooks/useRecoverableDraft";
import { DraftRecovery } from "@/components/ui/draft-recovery";
import { practiceImageInputError } from "@/domains/learning/practice-evidence";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/server/trpc/root";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Markdown } from "@/components/ui/markdown";
import { BookOpen, ImagePlus, Save, Sparkles, Trash2 } from "lucide-react";

export type PracticeRecord =
  RouterOutputs["learningPractices"]["list"]["items"][number];
type PracticeModalProps = Parameters<typeof PracticeEditor>[0];
export function PracticeModal(props: Omit<PracticeModalProps, "userId">) {
  const profile = trpc.profile?.get.useQuery();
  if (profile && !profile.data) return <Dialog open onOpenChange={open => { if (!open) props.onClose() }}><DialogContent><DialogTitle>Registrar práctica</DialogTitle><p role={profile.error ? "alert" : "status"}>{profile.error ? "No se pudo cargar tu perfil." : "Cargando tu perfil…"}</p>{profile.error && <Button onClick={() => void profile.refetch()}>Reintentar perfil</Button>}<Button variant="ghost" onClick={props.onClose}>Cancelar</Button></DialogContent></Dialog>;
  return <PracticeEditor key={`${profile?.data?.id ?? "unresolved"}:${props.record?.id ?? "new"}`} {...props} userId={profile?.data?.id} />;
}
function PracticeEditor({
  userId,
  record,
  plannedSession,
  repeatFrom,
  onRepeat,
  resourceId,
  today,
  timezone = "UTC",
  onClose,
  onChanged,
}: {
  userId?: string;
  record: PracticeRecord | null;
  plannedSession?: { id: string; resourceId: string; reviewSource: {kind: "weekly"; weekStart: string; conclusion: string} | null };
  repeatFrom?: PracticeRecord;
  onRepeat?: (record: PracticeRecord) => void;
  resourceId?: string;
  today?: string;
  timezone?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saved, setSaved] = useState(record);
  const [id, setId] = useState(() => record?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(record?.title ?? plannedSession?.reviewSource?.conclusion.slice(0, 160) ?? repeatFrom?.title ?? "");
  const [date, setDate] = useState(record?.date.slice(0, 10) ?? today ?? "");
  const [minutes, setMinutes] = useState(
    record ? String(record.durationMin) : repeatFrom ? "" : "30",
  );
  const [exercise, setExercise] = useState(
    record?.exercise ?? repeatFrom?.exercise ?? "",
  );
  const [reflection, setReflection] = useState(record?.reflection ?? "");
  const [resource, setResource] = useState(
    record?.resourceId ?? repeatFrom?.resourceId ?? plannedSession?.resourceId ?? resourceId ?? "",
  );
  const [objective, setObjective] = useState(
    record?.objective ?? plannedSession?.reviewSource?.conclusion ?? repeatFrom?.objective ?? "",
  );
  const [assessment, setAssessment] = useState(record?.assessment ?? "");
  const [repeatRequested, setRepeatRequested] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [activity, setActivity] = useState<
    | "save"
    | "upload"
    | "deleteImage"
    | "suggest"
    | "exercise"
    | "feedback"
    | "delete"
    | null
  >(null);
  const busy = activity !== null;
  const reviewSource = plannedSession?.reviewSource ?? repeatFrom?.reviewSource ?? (record as (PracticeRecord & { reviewSource?: { weekStart: string } | null }) | null)?.reviewSource;
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const suggest = trpc.learningPractices.suggestExercise.useMutation();
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    uploadId: string;
  } | null>(null);
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
    objective,
    assessment: (assessment || null) as
      | "achieved"
      | "partial"
      | "repeat"
      | null,
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
        objective: saved.objective ?? "",
        assessment: saved.assessment ?? null,
        resourceId: saved.resourceId,
      });
  const draftVersion = useRef(record?.version);
  const draft = useRecoverableDraft(userId, `practice:${saved?.id ?? (plannedSession?.id ? `plan:${plannedSession.id}` : repeatFrom?.id ? `repeat:${repeatFrom.id}` : `new:${resourceId ?? "all"}`)}`, (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const v = raw as Record<string, unknown>;
    if (typeof v.id !== "string" || !/^[0-9a-f-]{36}$/i.test(v.id)) return null;
    for (const field of ["title", "date", "minutes", "exercise", "reflection", "resource", "objective", "assessment"]) if (typeof v[field] !== "string") return null;
    if (v.version !== undefined && typeof v.version !== "number") return null;
    return { id: v.id, version: v.version as number | undefined, title: v.title as string, date: v.date as string, minutes: v.minutes as string, exercise: v.exercise as string, reflection: v.reflection as string, resource: v.resource as string, objective: v.objective as string, assessment: v.assessment as string };
  });
  const [initialInput] = useState(input);
  const hasUnsavedChanges =
    (saved
      ? dirty
      : JSON.stringify(input) !== JSON.stringify(initialInput) ||
        !!suggestion) || !!pendingUpload;
  const storeDraft = draft.store;
  useEffect(() => {
    if (draft.ready && !draft.recovery && hasUnsavedChanges && !busy) storeDraft({id, version: draftVersion.current, title, date, minutes, exercise, reflection, resource, objective, assessment});
  }, [storeDraft, draft.ready, draft.recovery, hasUnsavedChanges, busy, id, title, date, minutes, exercise, reflection, resource, objective, assessment]);
  function restoreDraft() {
    const v = draft.recovery?.value; if (!v) return;
    setId(v.id); draftVersion.current = v.version;
    setTitle(v.title); setDate(v.date); setMinutes(v.minutes); setExercise(v.exercise); setReflection(v.reflection); setResource(plannedSession?.resourceId ?? v.resource); setObjective(v.objective); setAssessment(v.assessment); draft.dismiss();
  }
  function requestClose() {
    if (busy) return;
    setRepeatRequested(false);
    if (hasUnsavedChanges) setDiscardOpen(true);
    else onClose();
  }
  useEffect(() => {
    if (!hasUnsavedChanges && !busy) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsavedChanges, busy]);
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
    const draftToken = draft.snapshot();
    setActivity("save");
    try {
      const p = saved
        ? await update.mutateAsync({
            ...input,
            id,
            expectedVersion: draftVersion.current ?? saved.version,
          })
        : await create.mutateAsync({ ...input, id, plannedSessionId: plannedSession?.id, repeatFromId: repeatFrom?.id });
      if (!p) throw Error("No se pudo guardar.");
      draft.clearSaved(draftToken);
      draftVersion.current = p.version;
      setSaved(p);
      setTitle(p.title);
      setExercise(p.exercise);
      setReflection(p.reflection);
      setObjective(p.objective ?? "");
      setAssessment(p.assessment ?? "");
      onChanged();
      setNotice(
        "Práctica guardada. Puedes añadir capturas o pedir ayuda al asistente.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar. Reintenta.",
      );
    } finally {
      setActivity(null);
    }
  }
  async function upload(file: File, uploadId: string) {
    if (!saved) return;
    setActivity("upload");
    setError("");
    try {
      const f = new FormData();
      f.set("practiceId", id);
      f.set("expectedVersion", String(saved.version));
      f.set("file", file);
      f.set("uploadId", uploadId);
      const r = await fetch("/api/upload/practice-image", {
        method: "POST",
        body: f,
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        if (r.status === 400 || r.status === 413) setPendingUpload(null);
        throw Error(
          d?.error ??
            (r.status === 413
              ? "Máximo 4 MB por imagen."
              : "No se pudo subir la captura. Reintenta."),
        );
      }
      await refresh();
      setPendingUpload(null);
      setNotice("Captura guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setActivity(null);
    }
  }
  async function deleteFile(attachmentId: string) {
    if (!saved) return;
    setActivity("deleteImage");
    setActiveImageId(attachmentId);
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
      setActivity(null);
      setActiveImageId(null);
    }
  }
  async function ask(kind: "exercise" | "feedback") {
    if (!saved) return;
    setActivity(kind);
    setError("");
    try {
      await feedback.mutateAsync({ id, expectedVersion: saved.version, kind });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar. Reintenta.",
      );
    } finally {
      setActivity(null);
    }
  }
  async function prepareExercise() {
    setActivity("suggest");
    setError("");
    try {
      setSuggestion(
        (await suggest.mutateAsync({ title, resourceId: resource || null }))
          .text,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo sugerir un ejercicio.",
      );
    } finally {
      setActivity(null);
    }
  }
  async function deletePractice() {
    if (!saved) return;
    setActivity("delete");
    setError("");
    try {
      await remove.mutateAsync({ id, expectedVersion: saved.version });
      onChanged();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo eliminar la práctica.",
      );
      setConfirm(false);
    } finally {
      setActivity(null);
    }
  }
  const formId = `practice-form-${id}`;
  const controlId = (name: string) => `practice-${id}-${name}`;
  const selectClass =
    "h-8 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] disabled:opacity-40";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent
        className="max-w-2xl"
        aria-describedby={controlId("description")}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen size={16} aria-hidden="true" />
            {saved ? "Tu práctica" : "Registrar práctica"}
          </DialogTitle>
          <DialogDescription>
            <span id={controlId("description")}>
              Registra cómo aplicaste lo aprendido. El tiempo de práctica se
              cuenta por separado del estudio.
            </span>
          </DialogDescription>
        </DialogHeader>
        {reviewSource && <a className="text-sm underline" href={`/reviews/semanal/${reviewSource.weekStart}`}>Ver review de origen</a>}
        {draft.recovery && <DraftRecovery onRestore={restoreDraft} onDiscard={draft.discard} />}
        <div className="space-y-5">
          <section aria-labelledby={controlId("registration-title")}>
            <h3
              id={controlId("registration-title")}
              className="mb-3 text-[13px] font-semibold text-[var(--ink)]"
            >
              Registro de práctica
            </h3>
            <form id={formId} onSubmit={save}>
              <fieldset
                disabled={busy || !!draft.recovery}
                className="space-y-4 disabled:opacity-60"
              >
                <legend className="sr-only">Datos de la práctica</legend>
                <Field
                  label="Qué practicaste"
                  htmlFor={controlId("title")}
                  required
                >
                  <Input
                    id={controlId("title")}
                    required
                    maxLength={160}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Fecha"
                    htmlFor={controlId("date")}
                    required
                    className="min-w-0"
                  >
                    <Input
                      id={controlId("date")}
                      required
                      type="date"
                      max={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Duración (minutos)"
                    htmlFor={controlId("minutes")}
                    required
                    className="min-w-0"
                  >
                    <Input
                      id={controlId("minutes")}
                      required
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </Field>
                </div>
                <Field
                  label="Recurso relacionado (opcional)"
                  htmlFor={controlId("resource")}
                >
                  <select
                    id={controlId("resource")}
                    className={selectClass}
                    value={resource}
                    disabled={!!plannedSession}
                    onChange={(e) => setResource(e.target.value)}
                  >
                    <option value="">Práctica independiente</option>
                    {resources.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Objetivo de esta práctica (opcional)"
                  htmlFor={controlId("objective")}
                >
                  <Textarea
                    id={controlId("objective")}
                    maxLength={1000}
                    rows={2}
                    placeholder="Por ejemplo: identificar tres soportes y explicar su validación."
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  />
                </Field>
                <Field
                  label="Qué hiciste"
                  htmlFor={controlId("exercise")}
                  required
                >
                  <Textarea
                    id={controlId("exercise")}
                    required
                    maxLength={5000}
                    rows={3}
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                  />
                </Field>
                <Field
                  label="Qué aprendiste o qué te costó (opcional)"
                  htmlFor={controlId("reflection")}
                >
                  <Textarea
                    id={controlId("reflection")}
                    maxLength={5000}
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                  />
                </Field>
                <Field
                  label="Autoevaluación (opcional)"
                  htmlFor={controlId("assessment")}
                >
                  <select
                    id={controlId("assessment")}
                    className={selectClass}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    aria-describedby={controlId("assessment-help")}
                  >
                    <option value="">Sin evaluar</option>
                    <option value="achieved">Lo logré</option>
                    <option value="partial">Parcialmente</option>
                    <option value="repeat">Necesito repetir</option>
                  </select>
                  <p
                    id={controlId("assessment-help")}
                    className="text-[12px] text-[var(--ink-3)]"
                  >
                    Tu valoración personal del objetivo después de practicar.
                  </p>
                </Field>
              </fieldset>
            </form>
          </section>
          {repeatFrom && !saved && (
            <p className="text-[12px] text-[var(--ink-3)]">
              Nuevo intento: registra los minutos y lo que hiciste al terminar.
              Las capturas y la autoevaluación anteriores no se copian.
            </p>
          )}
          {notice && (
            <p role="status" className="text-[12px] text-[var(--ink-2)]">
              {notice}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-[var(--radius-sm)] border border-[var(--loss)]/25 bg-[var(--loss-soft)] p-3 text-[12px] text-[var(--loss)]"
            >
              <p>{error}</p>
              {saved && (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  disabled={busy}
                  className="mt-2"
                  onClick={() => {
                    setError("");
                    void refresh().catch(() =>
                      setError("No se pudo actualizar. Reintenta."),
                    );
                  }}
                >
                  Actualizar versión sin borrar el borrador
                </Button>
              )}
            </div>
          )}
          {!saved && (
            <section
              aria-labelledby={controlId("guide-title")}
              className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-4 space-y-3"
            >
              <h3
                id={controlId("guide-title")}
                className="flex items-center gap-2 text-[13px] font-semibold"
              >
                <Sparkles size={14} aria-hidden="true" />
                Preparar un ejercicio
              </h3>
              <p className="text-[12px] text-[var(--ink-3)]">
                Escribe el concepto en «Qué practicaste» para recibir una guía.
                Registra la sesión después de practicar.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || !title.trim()}
                loading={activity === "suggest"}
                onClick={() => void prepareExercise()}
              >
                Ayúdame a preparar un ejercicio
              </Button>
              {suggestion && (
                <div className="space-y-3">
                  <Markdown content={suggestion} className="break-words" />
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    disabled={busy}
                    onClick={() => setExercise(suggestion)}
                  >
                    Usar como guía de la práctica
                  </Button>
                  <p className="text-[11px] text-[var(--ink-3)]">
                    La guía se conserva al usarla en el registro y guardar la
                    práctica.
                  </p>
                </div>
              )}
            </section>
          )}
          {saved && (
            <>
              <section
                aria-labelledby={controlId("evidence-title")}
                className="border-t border-[var(--line)] pt-4 space-y-3"
              >
                <div>
                  <h3
                    id={controlId("evidence-title")}
                    className="text-[13px] font-semibold"
                  >
                    Capturas
                  </h3>
                  <p
                    id={controlId("evidence-help")}
                    className="mt-1 text-[11px] text-[var(--ink-3)]"
                  >
                    Hasta cinco imágenes privadas. PNG, JPEG o WebP; 4 MB por
                    imagen.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((f, i) => (
                    <div key={f.id} className="space-y-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full overflow-hidden p-0"
                        aria-label={`Ampliar captura ${i + 1}`}
                        onClick={() => setExpanded(f.url)}
                      >
                        <img
                          src={f.url}
                          alt={`Captura de práctica ${i + 1}`}
                          className="h-24 w-full object-cover"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        aria-label={`Eliminar captura ${i + 1}`}
                        disabled={busy || dirty}
                        loading={
                          activity === "deleteImage" && activeImageId === f.id
                        }
                        onClick={() => void deleteFile(f.id)}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
                {saved.attachments.length < 5 && (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy || dirty || !!pendingUpload}
                      loading={activity === "upload"}
                      onClick={() => fileInput.current?.click()}
                    >
                      <ImagePlus size={14} aria-hidden="true" />
                      Añadir captura
                    </Button>
                    <input
                      ref={fileInput}
                      aria-label="Añadir captura"
                      aria-describedby={controlId("evidence-help")}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      tabIndex={-1}
                      disabled={busy || dirty || !!pendingUpload}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) {
                          const invalid = practiceImageInputError(file);
                          if (invalid) {
                            setError(invalid);
                            return;
                          }
                          const uploadId = crypto.randomUUID();
                          setPendingUpload({ file, uploadId });
                          void upload(file, uploadId);
                        }
                      }}
                    />
                  </div>
                )}
                {pendingUpload && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[var(--ink-3)]">
                      Captura pendiente de confirmar. Reintentar conserva la
                      misma subida.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      loading={activity === "upload"}
                      onClick={() =>
                        void upload(pendingUpload.file, pendingUpload.uploadId)
                      }
                    >
                      Reintentar captura
                    </Button>
                  </div>
                )}
              </section>
              <section
                aria-labelledby={controlId("assistant-title")}
                className="border-t border-[var(--line)] pt-4 space-y-3"
              >
                <div>
                  <h3
                    id={controlId("assistant-title")}
                    className="flex items-center gap-2 text-[13px] font-semibold"
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    Asistente de práctica
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                    Usa tu configuración del Coach. Solo se envían notas y, al
                    comentar, capturas cuando lo solicitas.
                  </p>
                </div>
                {dirty && (
                  <p className="text-[11px] text-[var(--ink-3)]">
                    Guarda los cambios para añadir capturas o pedir ayuda.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || dirty}
                    loading={activity === "exercise"}
                    onClick={() => void ask("exercise")}
                  >
                    Ayúdame a practicar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || dirty}
                    loading={activity === "feedback"}
                    onClick={() => void ask("feedback")}
                  >
                    Comentar esta práctica
                  </Button>
                </div>
                {saved.feedback.length > 0 && (
                  <div
                    className="space-y-3"
                    role="region"
                    aria-label="Comentarios guardados"
                  >
                    {saved.feedback.map((f) => (
                      <article
                        key={f.id}
                        className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 space-y-3"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--ink-3)]">
                          <span className="font-medium text-[var(--ink-2)]">
                            {f.kind === "exercise"
                              ? "Ejercicio sugerido"
                              : "Comentarios"}
                          </span>
                          <time dateTime={f.createdAt}>
                            {new Date(f.createdAt).toLocaleString("es", {
                              timeZone: timezone,
                            })}
                          </time>
                          <span
                            className={
                              f.version === saved.version
                                ? "rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]"
                                : "rounded-full bg-[var(--chip)] px-2 py-0.5 text-[var(--ink-3)]"
                            }
                          >
                            {f.version === saved.version
                              ? "Versión actual"
                              : "Sobre una versión anterior"}
                          </span>
                        </div>
                        <Markdown content={f.text} className="break-words" />
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
        <DialogFooter
          role="group"
          aria-label="Acciones de práctica"
          className="flex-wrap"
        >
          {saved && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              className="mr-auto"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={13} aria-hidden="true" />
              Eliminar práctica
            </Button>
          )}
          <div className="ml-auto flex flex-wrap justify-end items-center gap-2">
            {saved && onRepeat && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setRepeatRequested(true);
                    setDiscardOpen(true);
                  } else onRepeat(saved);
                }}
              >
                Volver a practicar
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={requestClose}
            >
              {saved ? "Cerrar" : "Cancelar"}
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="sm"
              disabled={busy || !dirty}
              loading={activity === "save"}
            >
              <Save size={13} aria-hidden="true" />
              {activity === "save"
                ? "Guardando…"
                : saved
                  ? "Guardar cambios"
                  : "Guardar práctica"}
            </Button>
          </div>
        </DialogFooter>
        {expanded && (
          <Dialog open onOpenChange={() => setExpanded(null)}>
            <DialogContent className="max-w-4xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Captura de práctica</DialogTitle>
              </DialogHeader>
              <img
                src={expanded}
                alt="Captura de práctica ampliada"
                className="max-h-[75dvh] w-full object-contain"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="¿Descartar los cambios?"
        description={
          pendingUpload
            ? "Se perderán el borrador y los reintentos de subida pendientes. Las capturas ya guardadas se conservan."
            : "Perderás los cambios que todavía no guardaste."
        }
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          draft.discard();
          setDiscardOpen(false);
          if (repeatRequested && saved && onRepeat) onRepeat(saved);
          else onClose();
        }}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
        title="¿Eliminar esta práctica?"
        description="Se eliminarán la práctica, sus capturas y sus comentarios."
        confirmLabel="Confirmar eliminación"
        cancelLabel="Conservar práctica"
        loading={activity === "delete"}
        onConfirm={() => void deletePractice()}
      />
    </Dialog>
  );
}
