"use client";
import { useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { trpc } from "@/lib/trpc/client";
import { safeTimeZone } from "@/lib/datetime/local";
import { formatErrorForUser } from "@/lib/error-formatter";

export function LearningReminderSettings({
  time,
  timezone,
  emailEnabled,
}: {
  time: string;
  timezone: string;
  emailEnabled: boolean;
}) {
  const update = trpc.profile.update.useMutation();
  const utils = trpc.useUtils();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const zone = safeTimeZone(timezone);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setNotice("");
    const value = String(
      new FormData(event.currentTarget).get("learningReminderTime") ?? "",
    );
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      setError("Introduce una hora válida en formato HH:mm (00:00–23:59).");
      return;
    }
    setSaving(true);
    try {
      await update.mutateAsync({ learningReminderTime: value });
      void utils.profile.get.invalidate();
      setNotice(`Horario guardado: ${value} (${zone}).`);
    } catch (err) {
      setError(
        err instanceof TRPCClientError
          ? formatErrorForUser(err)
          : "No se pudo guardar el horario. Reintenta.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={(event) => void save(event)}
      className="my-4 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-4 space-y-3"
      aria-label="Horario de aprendizaje"
    >
      <Field
        label="Hora del recordatorio de aprendizaje"
        htmlFor="learning-reminder-time"
      >
        <Input
          key={time}
          id="learning-reminder-time"
          name="learningReminderTime"
          type="text"
          defaultValue={time}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          maxLength={5}
          placeholder="19:00"
          required
          disabled={saving}
          aria-describedby="learning-reminder-help"
          className="max-w-36"
        />
      </Field>
      <p
        id="learning-reminder-help"
        className="text-[12px] text-[var(--ink-3)]"
      >
        Formato de 24 horas HH:mm · Zona del perfil: {zone}. Solo se envía si
        hay aprendizaje pendiente y el correo está habilitado; se respetan las
        horas de silencio.
      </p>
      {!emailEnabled && (
        <p className="text-[12px] text-[var(--ink-3)]">
          El correo de Aprendizaje está desactivado. Puedes guardar el horario
          sin activar los envíos.
        </p>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={saving}
        loading={saving}
      >
        Guardar horario
      </Button>
      {notice && (
        <p role="status" className="text-[12px] text-[var(--ink-2)]">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-[var(--loss)]">
          {error}
        </p>
      )}
    </form>
  );
}
