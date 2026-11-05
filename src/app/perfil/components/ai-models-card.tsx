"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/lib/use-toast";
import { formatErrorForUser } from "@/lib/error-formatter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ProviderModelSelect } from "./provider-model-select";
import {
  AI_FEATURES,
  ACTIVE_AI_FEATURES,
  type AiFeature,
  type AiSettings,
} from "@/lib/ai/feature-models";

const PROVIDERS = ["openrouter", "anthropic", "openai"] as const;
type Provider = (typeof PROVIDERS)[number];

const PROVIDER_LABEL: Record<Provider, string> = {
  openrouter: "OpenRouter",
  anthropic: "Anthropic",
  openai: "OpenAI",
};

const FEATURE_LABEL: Record<AiFeature, string> = {
  trade_analysis: "Análisis de trades",
  analytics_insights: "Inteligencia Analytics",
  review_generation: "Generación de reviews",
  psychology_analysis: "Análisis psicológico",
  learning_insights: "Insights de aprendizaje",
  weekly_reviews: "Reviews semanales",
  ai_chat: "Chat / Coach IA",
  embeddings: "Embeddings (búsqueda)",
};

const COST_OPTIONS = [
  {
    id: "quality",
    label: "Calidad",
    hint: "Mejor modelo aunque sea más lento/caro",
  },
  { id: "speed", label: "Velocidad", hint: "Modelos de baja latencia" },
  { id: "cost", label: "Costo", hint: "El más económico aceptable" },
] as const;

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--panel-2)",
  color: "var(--ink)",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

function ProviderSelect({
  value,
  onChange,
  label,
}: {
  value: Provider;
  onChange: (v: Provider) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Provider)}
      style={{ ...inputStyle, cursor: "pointer" }}
    >
      {PROVIDERS.map((p) => (
        <option key={p} value={p}>
          {PROVIDER_LABEL[p]}
        </option>
      ))}
    </select>
  );
}

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  user: { label: "Clave de usuario", color: "var(--win, #16a34a)" },
  env: { label: "Variable de entorno", color: "var(--be, #b45309)" },
  none: { label: "No configurada", color: "var(--loss, #dc2626)" },
};

function snapshot(value: AiSettings) {
  return JSON.stringify({
    defaultProvider: value.defaultProvider,
    defaultModel: value.defaultModel,
    fallbackProvider: value.fallbackProvider ?? "openrouter",
    fallbackModel: value.fallbackModel ?? "",
    costPriority: value.costPriority,
    features: AI_FEATURES.map((f) => [
      f,
      value.featureModels[f]?.provider ?? null,
      value.featureModels[f]?.model ?? null,
    ]),
  });
}

const persistedModelRef = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().max(1000),
});
const persistedModels = z.object({
  defaultProvider: z.enum(PROVIDERS),
  defaultModel: z.string().max(1000),
  fallbackProvider: z.enum(PROVIDERS).nullable(),
  fallbackModel: z.string().max(1000).nullable(),
  costPriority: z.enum(["quality", "speed", "cost"]),
  featureModels: z.object(
    Object.fromEntries(
      AI_FEATURES.map((f) => [f, persistedModelRef.optional()]),
    ) as Record<AiFeature, z.ZodOptional<typeof persistedModelRef>>,
  ),
});

export function AiModelsCard({
  onDirtyChange,
  userId,
  timezone = "UTC",
}: { onDirtyChange?: (dirty: boolean) => void; userId?: string; timezone?: string } = {}) {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.aiSettings.get.useQuery();
  const { data: settings } = settingsQuery;
  const dirtyRef = useRef(false);
  const restoredKey = useRef<string | null>(null);
  const appliedSettings = useRef<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const storageKey = userId ? `tj-profile-models-draft:${userId}` : null;
  const { data: diag } = trpc.aiConfig.diagnostics.useQuery();
  const updateMut = trpc.aiSettings.update.useMutation({
    onSuccess: (saved) => {
      utils.aiSettings.get.setData(undefined, saved);
      loadSettings(saved);
      setRecovered(false);
      if (storageKey) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
      utils.aiSettings.get.invalidate();
      utils.aiConfig.diagnostics.invalidate();
      toast.success("Configuración de modelos guardada");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });
  const healthMut = trpc.aiConfig.healthCheck.useMutation({
    onSuccess: (r) => {
      if (r.ok)
        toast.success(
          `IA OK · ${r.provider} · ${r.model}${r.detectedModels ? ` · ${r.detectedModels} modelos` : ""}`,
        );
      else
        toast.error(
          `Configuración IA inválida: ${r.error ?? "error desconocido"}`,
        );
      utils.aiConfig.diagnostics.invalidate();
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const indexQuery = trpc.aiConfig.indexStatus.useQuery();
  const indexRows = indexQuery.data ?? [];
  const reindexMut = trpc.aiConfig.reindex.useMutation({
    onSuccess: (r) => {
      utils.aiConfig.indexStatus.invalidate();
      toast.success(
        `Indexadas ${r.embedded}${r.remaining > 0 ? ` · quedan ${r.remaining}` : ""}`,
      );
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const [defaultProvider, setDefaultProvider] = useState<Provider>("anthropic");
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4-6");
  const [fallbackProvider, setFallbackProvider] =
    useState<Provider>("openrouter");
  const [fallbackModel, setFallbackModel] = useState("");
  const [costPriority, setCostPriority] = useState<
    "quality" | "speed" | "cost"
  >("quality");
  const [features, setFeatures] = useState<
    Partial<Record<AiFeature, { provider: Provider; model: string }>>
  >({});
  const [showFeatures, setShowFeatures] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const loadSettings = useCallback(
    (value: AiSettings, base = value, recoveredDraft = false) => {
      setDefaultProvider(value.defaultProvider);
      setDefaultModel(value.defaultModel);
      setFallbackProvider(value.fallbackProvider ?? "openrouter");
      setFallbackModel(value.fallbackModel ?? "");
      setCostPriority(value.costPriority);
      setFeatures(value.featureModels ?? {});
      setBaseline(snapshot(base));
      setRecovered(recoveredDraft);
      dirtyRef.current = false;
    },
    [
      setDefaultProvider,
      setDefaultModel,
      setFallbackProvider,
      setFallbackModel,
      setCostPriority,
      setFeatures,
      setBaseline,
      setRecovered,
    ],
  );
  const dirty =
    baseline !== null &&
    snapshot({
      defaultProvider,
      defaultModel,
      fallbackProvider,
      fallbackModel,
      costPriority,
      featureModels: features,
    }) !== baseline;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const ready =
    !!settings &&
    !settingsQuery.error &&
    !settingsQuery.isLoading &&
    baseline !== null;
  const canSave =
    ready && dirty && !updateMut.isPending && !!defaultModel.trim();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty || onDirtyChange) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!settings || dirtyRef.current) return;
    // Query adapters/refetches may return a new object with identical values.
    // Hydrate once per confirmed configuration and user, not per reference.
    const fingerprint = JSON.stringify([storageKey, snapshot(settings)]);
    if (appliedSettings.current === fingerprint) return;
    appliedSettings.current = fingerprint;
    loadSettings(settings);
    if (storageKey && restoredKey.current !== storageKey) {
      restoredKey.current = storageKey;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = persistedModels.safeParse(JSON.parse(raw));
          if (parsed.success && snapshot(parsed.data) !== snapshot(settings)) {
            loadSettings(parsed.data, settings, true);
          }
        }
      } catch {
        /* Storage can be unavailable in private browsing. */
      }
    }
  }, [settings, loadSettings, storageKey]);

  useEffect(() => {
    if (!storageKey || baseline === null) return;
    try {
      if (dirty)
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            defaultProvider,
            defaultModel,
            fallbackProvider,
            fallbackModel,
            costPriority,
            featureModels: features,
          }),
        );
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Draft protection still works without browser storage. */
    }
  }, [
    storageKey,
    baseline,
    dirty,
    defaultProvider,
    defaultModel,
    fallbackProvider,
    fallbackModel,
    costPriority,
    features,
  ]);

  function save() {
    if (!canSave) return;
    updateMut.mutate({
      defaultProvider,
      defaultModel: defaultModel.trim(),
      fallbackProvider: fallbackModel.trim() ? fallbackProvider : null,
      fallbackModel: fallbackModel.trim() || null,
      costPriority,
      // Iterates every feature, not just the offered ones: the mutation replaces
      // featureModels wholesale, so omitting a key would delete an override a user
      // saved back when the inactive features were still configurable.
      featureModels: Object.fromEntries(
        AI_FEATURES.map((f) => [
          f,
          features[f]?.model?.trim()
            ? {
                provider: features[f]!.provider,
                model: features[f]!.model.trim(),
              }
            : null,
        ]),
      ),
    });
  }

  function setFeature(
    f: AiFeature,
    patch: Partial<{ provider: Provider; model: string }>,
  ) {
    setFeatures((prev) => ({
      ...prev,
      [f]: {
        provider: patch.provider ?? prev[f]?.provider ?? defaultProvider,
        model: patch.model ?? prev[f]?.model ?? "",
      },
    }));
  }

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 24,
        marginTop: 20,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        Modelos de IA
      </p>
      <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 18 }}>
        Modelo global por defecto + fallback. Opcionalmente un modelo distinto
        por funcionalidad. Selecciona un modelo del catálogo de cada proveedor.
        «Automático» elige según tu <b>prioridad</b>. También puedes introducir
        un ID manual.
      </p>

      {recovered && dirty && (
        <p role="status" className="mb-3 text-sm">
          Borrador de modelos recuperado. Revísalo antes de guardar.
        </p>
      )}
      {settingsQuery.error && (
        <div role="alert" className="mb-4 text-sm">
          No se pudo cargar tu configuración. Tus modelos guardados no se han
          cambiado.
          <Button
            type="button"
            onClick={() => settingsQuery.refetch()}
            disabled={settingsQuery.isFetching}
          >
            Reintentar cargar modelos
          </Button>
        </div>
      )}
      {settingsQuery.isLoading && (
        <p role="status">Cargando configuración de modelos…</p>
      )}
      <fieldset
        disabled={!ready || updateMut.isPending}
        className="min-w-0 border-0 p-0 m-0"
      >
        {/* Global default */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-2.5 mb-4">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <label
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--ink-3)",
              }}
            >
              Proveedor por defecto
            </label>
            <ProviderSelect
              label="Proveedor por defecto"
              value={defaultProvider}
              onChange={(p) => {
                setDefaultProvider(p);
                setDefaultModel("auto");
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <label
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--ink-3)",
              }}
            >
              Modelo por defecto
            </label>
            <ProviderModelSelect
              key={defaultProvider}
              provider={defaultProvider}
              label="Modelo por defecto"
              value={defaultModel}
              onChange={setDefaultModel}
              warnTools
            />
          </div>
        </div>

        {/* Global fallback */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-2.5 mb-4">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <label
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--ink-3)",
              }}
            >
              Proveedor fallback
            </label>
            <ProviderSelect
              label="Proveedor fallback"
              value={fallbackProvider}
              onChange={(p) => {
                setFallbackProvider(p);
                setFallbackModel("");
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <label
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--ink-3)",
              }}
            >
              Modelo fallback (opcional)
            </label>
            <ProviderModelSelect
              key={fallbackProvider}
              provider={fallbackProvider}
              label="Modelo fallback"
              value={fallbackModel}
              onChange={setFallbackModel}
              emptyLabel="Sin fallback"
            />
          </div>
        </div>

        {/* Cost priority */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: "var(--ink-3)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Prioridad
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COST_OPTIONS.map((o) => (
              <Button
                key={o.id}
                aria-pressed={costPriority === o.id}
                type="button"
                onClick={() => setCostPriority(o.id)}
                title={o.hint}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${costPriority === o.id ? "var(--accent)" : "var(--line)"}`,
                  background:
                    costPriority === o.id
                      ? "var(--accent-soft)"
                      : "var(--panel-2)",
                  color:
                    costPriority === o.id ? "var(--accent)" : "var(--ink-2)",
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Per-feature overrides */}
        <Button
          type="button"
          aria-expanded={showFeatures}
          onClick={() => setShowFeatures((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 600,
            padding: 0,
            marginBottom: showFeatures ? 12 : 0,
          }}
        >
          {showFeatures ? "▲" : "▼"} Modelos por funcionalidad (opcional)
        </Button>
        {showFeatures && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {ACTIVE_AI_FEATURES.map((f) => (
              <div
                key={f}
                className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr_1.4fr] gap-2 items-center min-w-0"
              >
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  {FEATURE_LABEL[f]}
                </span>
                <ProviderSelect
                  label={`Proveedor: ${FEATURE_LABEL[f]}`}
                  value={features[f]?.provider ?? defaultProvider}
                  onChange={(p) => setFeature(f, { provider: p, model: "" })}
                />
                <ProviderModelSelect
                  key={features[f]?.provider ?? defaultProvider}
                  provider={features[f]?.provider ?? defaultProvider}
                  label={`Modelo: ${FEATURE_LABEL[f]}`}
                  value={features[f]?.model ?? ""}
                  onChange={(model) => setFeature(f, { model })}
                  emptyLabel={
                    f === "embeddings"
                      ? "Automático para embeddings"
                      : "Usar predeterminado"
                  }
                  purpose={f === "embeddings" ? "embeddings" : "chat"}
                  warnTools={f === "ai_chat"}
                />
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={save}
          disabled={!canSave}
          loading={updateMut.isPending}
        >
          {updateMut.isPending ? "Guardando…" : "Guardar modelos"}
        </Button>
        {dirty && (
          <Button
            type="button"
            onClick={() => {
              if (settings) loadSettings(settings);
              setRecovered(false);
            }}
            disabled={updateMut.isPending}
          >
            Cancelar cambios de modelos
          </Button>
        )}
        {ready && (
          <span role="status" className="text-xs text-[var(--ink-3)]">
            {dirty ? "Cambios sin guardar" : "Guardado"}
          </span>
        )}
      </div>

      {/* ── Diagnóstico IA ── */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
            Diagnóstico IA
          </p>
          <Button
            type="button"
            onClick={() => healthMut.mutate()}
            disabled={healthMut.isPending}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              opacity: healthMut.isPending ? 0.6 : 1,
            }}
          >
            {healthMut.isPending
              ? "Verificando…"
              : "Verificar configuración IA"}
          </Button>
        </div>

        {diag && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Efectivo */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "var(--ink-3)" }}>
                  Proveedor efectivo:{" "}
                </span>
                <b style={{ color: "var(--ink)" }}>
                  {PROVIDER_LABEL[diag.defaultProvider as Provider] ??
                    diag.defaultProvider}
                </b>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Modelo efectivo: </span>
                <b style={{ color: "var(--ink)" }}>{diag.defaultModel}</b>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Fallback: </span>
                <b style={{ color: "var(--ink)" }}>
                  {diag.fallbackProvider
                    ? `${PROVIDER_LABEL[diag.fallbackProvider as Provider] ?? diag.fallbackProvider} · ${diag.fallbackModel}`
                    : "—"}
                </b>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Prioridad: </span>
                <b style={{ color: "var(--ink)" }}>{diag.costPriority}</b>
              </div>
            </div>

            {/* Estado de API Keys */}
            <div>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--ink-3)",
                  marginBottom: 6,
                }}
              >
                Estado de API Keys
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {diag.keys.map((k) => {
                  const s = SOURCE_LABEL[k.source];
                  return (
                    <span
                      key={k.provider}
                      style={{
                        fontSize: 11.5,
                        padding: "3px 9px",
                        borderRadius: 999,
                        border: `1px solid ${s.color}`,
                        color: s.color,
                        background: "var(--panel-2)",
                      }}
                    >
                      {PROVIDER_LABEL[k.provider as Provider] ?? k.provider}:{" "}
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Feature resolution (solo features activas) */}
            <div>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--ink-3)",
                  marginBottom: 6,
                }}
              >
                Resolución por funcionalidad (activas)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {diag.features
                  .filter((f) => f.active)
                  .map((f) => (
                    <div
                      key={f.feature}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1.4fr 0.9fr",
                        gap: 8,
                        fontSize: 11.5,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--ink-2)" }}>
                        {FEATURE_LABEL[f.feature as AiFeature] ?? f.feature}
                      </span>
                      <span style={{ color: "var(--ink)" }}>
                        {PROVIDER_LABEL[f.provider as Provider] ?? f.provider}
                      </span>
                      <span
                        style={{
                          color: "var(--ink)",
                          fontFamily: "'JetBrains Mono',monospace",
                        }}
                      >
                        {f.model}
                      </span>
                      <span style={{ color: SOURCE_LABEL[f.source].color }}>
                        {SOURCE_LABEL[f.source].label}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Indexación semántica ── */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
            Indexación semántica
          </p>
          <Button
            type="button"
            onClick={() => reindexMut.mutate({})}
            disabled={reindexMut.isPending}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              opacity: reindexMut.isPending ? 0.6 : 1,
            }}
          >
            {reindexMut.isPending ? "Indexando…" : reindexMut.error ? "Reintentar indexación" : "Indexar ahora"}
          </Button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 10 }}>
          Cuántas de tus notas puede encontrar el Coach por significado.
        </p>
        <Button type="button" onClick={() => void indexQuery.refetch()} disabled={indexQuery.isFetching}>
          {indexQuery.isFetching ? "Consultando…" : indexQuery.error ? "Reintentar consulta" : "Actualizar estado"}
        </Button>
        {indexQuery.isLoading && <p role="status">Consultando índice…</p>}
        {indexQuery.error && <p role="alert">No se pudo consultar el índice. {formatErrorForUser(indexQuery.error)}</p>}
        {indexRows[0]?.checkedAt && <p style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          Estado comprobado: {new Date(indexRows[0].checkedAt).toLocaleString("es-ES", { timeZone: timezone })} ({timezone})
        </p>}
        {reindexMut.error && <p role="alert">{formatErrorForUser(reindexMut.error)}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {indexRows.map((row) => {
            const done = row.withText > 0 && row.embedded >= row.withText;
            return (
              <div
                key={row.corpus}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                }}
              >
                <span style={{ color: "var(--ink-2)" }}>{row.label}</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    color: done ? "var(--win)" : "var(--ink-3)",
                  }}
                >
                  {row.embedded}/{row.withText} indexadas · {row.state === "NO_KEY" ? "Sin clave de embeddings" : row.state === "EMPTY_CORPUS" ? "Sin notas" : row.state === "OK" ? "Actualizado" : "Pendiente"}
                </span>
              </div>
            );
          })}
        </div>
        {reindexMut.data && (
          <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8 }}>
            Indexadas {reindexMut.data.embedded} · fallaron{" "}
            {reindexMut.data.failed} · quedan {reindexMut.data.remaining}
          </p>
        )}
      </div>
    </div>
  );
}
