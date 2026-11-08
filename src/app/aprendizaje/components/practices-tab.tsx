"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCalendarDate } from "@/lib/datetime/local";
import { PracticeModal, type PracticeRecord } from "../modals/practice-modal";

export function PracticeWeekSummary({ onOpen }: { onOpen: () => void }) {
  const q = trpc.learningPractices.summary.useQuery();
  return (
    <section
      aria-label="Práctica esta semana"
      className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 mb-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Práctica esta semana</h3>
          {q.data && (
            <p className="text-sm text-[var(--ink-2)]">
              {q.data.minutes} min · {q.data.sessions} sesiones
            </p>
          )}
          {q.isLoading && <p>Cargando práctica…</p>}
          {q.error && (
            <p role="alert">
              No se pudo cargar.{" "}
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => void q.refetch()}
              >
                Reintentar
              </Button>
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onOpen}>
          Registrar práctica
        </Button>
      </div>
    </section>
  );
}
export function ResourcePracticeHistory({
  resourceId,
  onOpen,
}: {
  resourceId: string;
  onOpen: () => void;
}) {
  const q = trpc.learningPractices.list.useQuery({ resourceId, limit: 3 });
  return (
    <section className="mt-4 border-t border-[var(--line)] pt-4">
      <h3 className="text-sm font-semibold">Prácticas de este recurso</h3>
      {q.error ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => void q.refetch()}
        >
          Reintentar prácticas
        </Button>
      ) : q.isLoading ? (
        <p>Cargando…</p>
      ) : q.data?.items.length ? (
        <ul>
          {q.data.items.map((p) => (
            <li key={p.id} className="text-xs py-1">
              {formatCalendarDate(p.date)} · {p.title} · {p.durationMin} min
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--ink-3)]">
          Todavía no has registrado prácticas.
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={onOpen}
      >
        Practicar este contenido
      </Button>
    </section>
  );
}
export function PracticesTab({
  initialResourceId,
  registerOnOpen = false,
  plannedSessionId,
}: {
  initialResourceId?: string;
  registerOnOpen?: boolean;
  plannedSessionId?: string;
}) {
  const [resourceId, setResourceId] = useState(initialResourceId ?? "");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [editing, setEditing] = useState<PracticeRecord | null | undefined>(
    registerOnOpen && !plannedSessionId ? null : undefined,
  );
  const [repeatFrom, setRepeatFrom] = useState<PracticeRecord | undefined>();
  const [modalKey, setModalKey] = useState(0);
  const [activePlanId, setActivePlanId] = useState(plannedSessionId);
  const [openedPlan, setOpenedPlan] = useState<Parameters<typeof PracticeModal>[0]["plannedSession"]>();
  const plan = trpc.studySessions?.getPlan.useQuery(
    { id: activePlanId ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: !!activePlanId },
  );
  function clearPlanEntry() {
    setActivePlanId(undefined);
    setOpenedPlan(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("plannedSessionId");
    url.searchParams.delete("register");
    window.history.replaceState(window.history.state, "", url);
  }

  const resources = trpc.learningResources.list.useQuery();
  const q = trpc.learningPractices.list.useInfiniteQuery(
    {
      limit: 20,
      resourceId: resourceId || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    { getNextPageParam: (p) => p.nextCursor ?? undefined },
  );
  const summary = trpc.learningPractices.summary.useQuery();
  useEffect(() => {
    if (!activePlanId || openedPlan || editing !== undefined || !plan?.data || !summary.data) return;
    setOpenedPlan(plan.data);
    setEditing(null);
    setModalKey(k => k + 1);
  }, [activePlanId, openedPlan, editing, plan?.data, summary.data]);
  const utils = trpc.useUtils();
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = !!(resourceId || from || to);
  const changed = () => {
    void utils.learningPractices.invalidate();
    void utils.studySessions?.home.invalidate();
    void utils.today?.plan.invalidate();
    void utils.weeklyReviews?.followUp.invalidate();
  };
  const field =
    "h-8 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] min-w-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]";
  return (
    <section aria-label="Prácticas de aprendizaje">
      {activePlanId && !openedPlan && <div className="mb-4 text-sm" role={plan?.error ? "alert" : "status"}>
        <p>{plan?.error ? "La planificación no está disponible. Puede haberse completado o eliminado." : "Cargando la planificación y la fecha de tu perfil…"}</p>
        {plan?.error && <Button variant="link" size="sm" onClick={() => void plan.refetch()}>Reintentar planificación</Button>}
        <Button variant="link" size="sm" onClick={clearPlanEntry}>Cancelar planificación</Button>
      </div>}
      <div className="flex flex-wrap justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Prácticas</h2>
          <p className="text-sm text-[var(--ink-3)]">
            Aplica lo aprendido y guarda tus observaciones.
          </p>
          {summary.data && (
            <p className="text-sm mt-1">
              Esta semana: {summary.data.minutes} min · {summary.data.sessions}{" "}
              sesiones de práctica
            </p>
          )}
          {summary.error && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => void summary.refetch()}
            >
              Reintentar resumen
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="self-start"
          onClick={() => {
            clearPlanEntry();
            setRepeatFrom(undefined);
            setEditing(null);
            setModalKey((k) => k + 1);
          }}
        >
          Registrar práctica
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <label className="text-xs">
          Recurso
          <select
            aria-label="Filtrar por recurso"
            className={`${field} block w-full`}
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          >
            <option value="">Todos los recursos</option>
            {resources.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Desde
          <Input
            aria-label="Desde"
            type="date"
            className="block w-full"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Hasta
          <Input
            aria-label="Hasta"
            type="date"
            className="block w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {filtered && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mb-3"
          onClick={() => {
            setResourceId("");
            setFrom("");
            setTo("");
          }}
        >
          Limpiar filtros
        </Button>
      )}
      {q.error && (
        <p role="alert" className="text-sm mb-3">
          No se pudieron cargar las prácticas.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void q.refetch()}
          >
            Reintentar
          </Button>
        </p>
      )}
      {q.isLoading ? (
        <p>Cargando prácticas…</p>
      ) : !items.length && !q.error ? (
        <p className="rounded-xl border border-[var(--line)] p-6 text-sm">
          {filtered
            ? "No hay prácticas con estos filtros."
            : "Tu primera práctica empieza con un concepto. Registra qué hiciste y qué aprendiste."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => { clearPlanEntry(); setEditing(p); }}
              >
                <span className="block font-semibold">{p.title}</span>
                <span className="text-xs text-[var(--ink-3)]">
                  {formatCalendarDate(p.date)} · {p.durationMin} min ·{" "}
                  {p.resource?.title ?? "Práctica independiente"}
                </span>
                <p className="text-sm mt-2 line-clamp-2">{p.exercise}</p>
                {p.objective && (
                  <p className="text-xs mt-1 line-clamp-2">
                    Objetivo: {p.objective}
                  </p>
                )}
                {p.assessment && (
                  <span className="block text-xs mt-1 text-[var(--ink-2)]">
                    Autoevaluación:{" "}
                    {(
                      {
                        achieved: "Lo logré",
                        partial: "Parcialmente",
                        repeat: "Necesito repetir",
                      } as Record<string, string>
                    )[p.assessment] ?? "Sin evaluar"}
                  </span>
                )}
                <span className="text-xs">
                  {p.attachments.length} capturas · {p.feedback.length}{" "}
                  comentarios
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
          className="text-sm mt-4"
        >
          {q.isFetchingNextPage ? "Cargando…" : "Cargar más prácticas"}
        </Button>
      )}
      {editing === null && !summary.data && (
        <p role="status" className="text-sm">
          {summary.error
            ? "No se pudo obtener la fecha del perfil. Reintenta el resumen para registrar la práctica."
            : "Cargando la fecha de tu perfil…"}
        </p>
      )}
      {editing !== undefined && (editing !== null || summary.data) && (
        <PracticeModal
          key={openedPlan ? `${openedPlan.id}:${modalKey}` : modalKey}
          plannedSession={openedPlan}
          record={editing}
          repeatFrom={repeatFrom}
          onRepeat={(record) => {
            clearPlanEntry();
            setRepeatFrom(record);
            setEditing(null);
            setModalKey((k) => k + 1);
          }}
          resourceId={resourceId || undefined}
          today={summary.data?.today}
          timezone={summary.data?.timezone}
          onClose={() => {
            clearPlanEntry();
            setEditing(undefined);
            setRepeatFrom(undefined);
          }}
          onChanged={changed}
        />
      )}
    </section>
  );
}
