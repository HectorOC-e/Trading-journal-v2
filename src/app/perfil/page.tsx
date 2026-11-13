"use client";

import {
  useState,
  useEffect,
  useId,
  Children,
  cloneElement,
  isValidElement,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field as SharedField } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  parseProfileNumber,
  readProfileDraft,
} from "@/domains/profile/profile-form";
import { downloadProfileExport } from "@/domains/profile/download-profile-export";
import { TopBar } from "@/components/layout/top-bar";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/lib/use-toast";
import { formatErrorForUser } from "@/lib/error-formatter";
import { useLogout } from "@/hooks/useLogout";
import { USD_VALUE, SUPPORTED_CURRENCIES } from "@/lib/fx";
import { AiModelsCard } from "./components/ai-models-card";
import { PaletteStudio } from "./components/palette-studio";
import { LearningReminderSettings } from "./components/learning-reminder-settings";

/* ── Inline primitives ─────────────────────────────────────────────── */

function Card({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: `1px solid ${danger ? "var(--loss)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        padding: "24px",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--ink)",
        marginBottom: 20,
      }}
    >
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const control = Children.only(children);
  return (
    <SharedField label={label} htmlFor={id}>
      {isValidElement<{ id?: string }>(control)
        ? cloneElement(control, { id })
        : control}
    </SharedField>
  );
}
function TextInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  onChange?: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onChange,
  disabled,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
        borderBottom: "1px solid var(--line)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
            {sub}
          </p>
        )}
      </div>
      <Switch
        label={label}
        checked={on}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

const PrimaryBtn = (props: React.ComponentProps<typeof Button>) => (
  <Button type="button" variant="primary" {...props} />
);
const GhostBtn = (props: React.ComponentProps<typeof Button>) => (
  <Button type="button" variant="ghost" {...props} />
);
const DangerBtn = (props: React.ComponentProps<typeof Button>) => (
  <Button type="button" variant="danger" {...props} />
);

/* ── Skeleton ────────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div
      style={{
        maxWidth: 780,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {[120, 200, 100, 180, 120, 100].map((h, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: h,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
const COLORBLIND_OPTIONS = [
  { value: "default", label: "Normal" },
  { value: "deuteranopia", label: "Deuteranopia" },
  { value: "mono", label: "Monocromo" },
];

const AI_PROVIDERS = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    hint: "Obtén tu clave en console.anthropic.com",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-...",
    hint: "Obtén tu clave en openrouter.ai/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    hint: "Obtén tu clave en platform.openai.com/api-keys",
  },
];

const SESSIONS = [
  { key: "Asia", start: "00:00", end: "08:00 / 21:00–24:00" },
  { key: "London", start: "08:00", end: "13:00" },
  { key: "New York", start: "13:00", end: "17:00" },
  { key: "London Close", start: "17:00", end: "21:00" },
];

const TIMEZONES = [
  "America/Tegucigalpa",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Madrid",
  "Asia/Tokyo",
  "UTC",
];

export default function PerfilPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("Datos");
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [modelsDirty, setModelsDirty] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [formError, setFormError] = useState("");
  const [goalsError, setGoalsError] = useState("");
  const [deleteProvider, setDeleteProvider] = useState<
    "anthropic" | "openrouter" | "openai" | null
  >(null);
  const [exportProgress, setExportProgress] = useState("");
  const leavingConfirmed = useRef(false);
  const goalsRecovered = useRef(false);
  const utils = trpc.useUtils();
  const handleSignOut = useLogout();

  /* ── Server data ── */
  const { data: profile, isLoading, isError } = trpc.profile.get.useQuery();
  const prefsQuery = trpc.preferences.get.useQuery();
  const { data: prefs } = prefsQuery;
  const notifQuery = trpc.notifications.preferences.list.useQuery();
  const { data: notifPrefs } = notifQuery;

  /* ── Local form state — initialized from server data ── */
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [baseCurrency, setBaseCurrency] = useState("");
  const [fxRates, setFxRates] = useState<Record<string, string>>({});
  const [personalBaseline, setPersonalBaseline] = useState("");
  const [goalsBaseline, setGoalsBaseline] = useState("");
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const restoredDraft = useRef<ReturnType<typeof readProfileDraft> | undefined>(
    undefined,
  );
  const [formInitialized, setFormInitialized] = useState(false);
  const [disciplineGoal, setDisciplineGoal] = useState("");
  const [weeklyTradesGoal, setWeeklyTradesGoal] = useState("");
  const [weeklyPnlGoal, setWeeklyPnlGoal] = useState("");
  const [weeklyGoalMinutesG, setWeeklyGoalMinutesG] = useState("");
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  /* ── Password modal state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const personalValues = { name, timezone, language, baseCurrency, fxRates };
  const goalValues = {
    disciplineGoal,
    weeklyTradesGoal,
    weeklyPnlGoal,
    weeklyGoalMinutesG,
  };
  const personalDirty =
    formInitialized && JSON.stringify(personalValues) !== personalBaseline;
  const goalsDirty =
    Boolean(goalsBaseline) && JSON.stringify(goalValues) !== goalsBaseline;
  const dirty =
    personalDirty ||
    goalsDirty ||
    modelsDirty ||
    Boolean(aiKeyInput) ||
    Boolean(newPassword);
  function loadPersonal(value: NonNullable<typeof profile>) {
    const canonical = {
      name: value.name ?? "",
      timezone: value.timezone ?? "America/Tegucigalpa",
      language: (value.language as "es" | "en") ?? "es",
      baseCurrency: value.baseCurrency ?? "USD",
      fxRates: Object.fromEntries(
        Object.entries(value.fxRates ?? {}).map(([key, rate]) => [
          key,
          String(rate),
        ]),
      ),
    };
    setName(canonical.name);
    setTimezone(canonical.timezone);
    setLanguage(canonical.language);
    setBaseCurrency(canonical.baseCurrency);
    setFxRates(canonical.fxRates);
    setPersonalBaseline(JSON.stringify(canonical));
    setFormInitialized(true);
  }
  useEffect(() => {
    if (!profile || personalDirty) return;
    loadPersonal(profile);
    if (restoredDraft.current === undefined) {
      try {
        restoredDraft.current = readProfileDraft(
          sessionStorage.getItem(`tj-profile-draft:${profile.id}`),
        );
      } catch {
        restoredDraft.current = null;
      }
      const recovered = restoredDraft.current?.personal;
      if (recovered) {
        setName(recovered.name);
        setTimezone(recovered.timezone);
        setLanguage(recovered.language);
        setBaseCurrency(recovered.baseCurrency);
        setFxRates(recovered.fxRates);
        setRecoveredDraft(true);
      }
    }
    // Server refetch refreshes clean fields while preserving local drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  /* ── Delete confirmation ── */
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  /* ── Mutations ── */
  const updateMut = trpc.profile.update.useMutation({
    onSuccess: (value, variables) => {
      utils.profile.get.setData(undefined, value);
      if (
        Object.keys(variables).some((key) =>
          ["name", "timezone", "language", "baseCurrency", "fxRates"].includes(
            key,
          ),
        )
      ) {
        loadPersonal(value);
        setRecoveredDraft(false);
      }
      utils.profile.get.invalidate();
      utils.goals.get.invalidate();
      toast.success("Perfil actualizado correctamente");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const changePasswordMut = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setShowPasswordForm(false);
      setNewPassword("");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const deleteMut = trpc.profile.deleteAccount.useMutation({
    onSuccess: async (result) => {
      discardStoredDraft();
      if (result.status === "completed")
        toast.success("Cuenta y datos eliminados.");
      else
        toast.info(
          "Eliminación en proceso. Los reintentos continuarán automáticamente; la limpieza aún no ha terminado.",
        );
      // Auth deletion does not invalidate the JWT cookie immediately. Clear it,
      // client caches and history through the same logout path as a normal exit.
      await handleSignOut();
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const updatePrefsMut = trpc.preferences.update.useMutation({
    onSuccess: () => utils.preferences.get.invalidate(),
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  /* ── Per-category email channel (opt-in) ── */
  const updateNotifPref = trpc.notifications.preferences.update.useMutation({
    onSuccess: () => utils.notifications.preferences.list.invalidate(),
    onError: (err) => toast.error(formatErrorForUser(err)),
  });
  const testEmailMut = trpc.notifications.sendTestEmail.useMutation({
    onSuccess: (d) =>
      d.dryRun
        ? toast.success(
            "Modo dry-run: sin RESEND_API_KEY no se envió nada (el flujo funciona).",
          )
        : toast.success(
            `Correo de prueba enviado a ${d.to}. Revisa tu bandeja (y spam).`,
          ),
    onError: (err) => toast.error(formatErrorForUser(err)),
  });
  const aprendizajePref = notifPrefs?.find((p) => p.category === "Aprendizaje");
  const aprendizajeChans = aprendizajePref?.channels ?? ["in_app"];
  const aprendizajeEmailOn = aprendizajeChans.includes("email");
  const setAprendizajeEmail = (on: boolean) => {
    const channels = on
      ? Array.from(new Set([...aprendizajeChans, "email"]))
      : aprendizajeChans.filter((c) => c !== "email");
    updateNotifPref.mutate({ category: "Aprendizaje", channels });
  };
  const reviewsPref = notifPrefs?.find((p) => p.category === "Reviews");
  const reviewsChans = reviewsPref?.channels ?? ["in_app"];
  const reviewsEmailOn = reviewsChans.includes("email");
  const setReviewsEmail = (on: boolean) => {
    const channels = on
      ? Array.from(new Set([...reviewsChans, "email"]))
      : reviewsChans.filter((c) => c !== "email");
    updateNotifPref.mutate({ category: "Reviews", channels });
  };
  const fiscalPref = notifPrefs?.find((p) => p.category === "Fiscalidad");
  const fiscalChannels = fiscalPref?.channels ?? ["in_app"];
  const setFiscalEmail = (on: boolean) => {
    const channels = on
      ? Array.from(new Set([...fiscalChannels, "email"]))
      : fiscalChannels.filter((c) => c !== "email");
    updateNotifPref.mutate({
      category: "Fiscalidad",
      channels,
      timezone: profile?.timezone ?? "UTC",
    });
  };

  /* ── Goals ── */
  const goalsQuery = trpc.goals.get.useQuery();
  const { data: goalsData } = goalsQuery;
  const setGoalsMut = trpc.goals.set.useMutation({
    onSuccess: (value) => {
      utils.goals.get.setData(undefined, value);
      loadGoals(value);
      setRecoveredDraft(false);
      utils.goals.get.invalidate();
      utils.profile.get.invalidate();
      toast.success("Metas actualizadas");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  const [goalsInitialized, setGoalsInitialized] = useState(false);
  function loadGoals(value: NonNullable<typeof goalsData>) {
    const canonical = {
      disciplineGoal: String(value.disciplineGoal ?? ""),
      weeklyTradesGoal: String(value.weeklyTradesGoal ?? ""),
      weeklyPnlGoal: String(value.weeklyPnlGoal ?? ""),
      weeklyGoalMinutesG: String(value.weeklyGoalMinutes ?? ""),
    };
    setDisciplineGoal(canonical.disciplineGoal);
    setWeeklyTradesGoal(canonical.weeklyTradesGoal);
    setWeeklyPnlGoal(canonical.weeklyPnlGoal);
    setWeeklyGoalMinutesG(canonical.weeklyGoalMinutesG);
    setGoalsBaseline(JSON.stringify(canonical));
    setGoalsInitialized(true);
  }
  useEffect(() => {
    if (!goalsData || !formInitialized || goalsDirty) return;
    loadGoals(goalsData);
    const recovered = restoredDraft.current?.goals;
    if (!goalsRecovered.current && recovered) {
      setDisciplineGoal(recovered.disciplineGoal);
      setWeeklyTradesGoal(recovered.weeklyTradesGoal);
      setWeeklyPnlGoal(recovered.weeklyPnlGoal);
      setWeeklyGoalMinutesG(recovered.weeklyGoalMinutesG);
      setRecoveredDraft(true);
    }
    goalsRecovered.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsData, formInitialized]);

  useEffect(() => {
    if (!profile || !formInitialized || !goalsInitialized) return;
    try {
      const key = `tj-profile-draft:${profile.id}`;
      if (personalDirty || goalsDirty)
        sessionStorage.setItem(
          key,
          JSON.stringify({
            personal: personalDirty ? personalValues : undefined,
            goals: goalsDirty ? goalValues : undefined,
          }),
        );
      else sessionStorage.removeItem(key);
    } catch {
      /* The form remains usable if browser storage is unavailable. */
    }
    // Only non-sensitive manual fields are ever stored; keys/passwords stay in memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    timezone,
    language,
    baseCurrency,
    fxRates,
    disciplineGoal,
    weeklyTradesGoal,
    weeklyPnlGoal,
    weeklyGoalMinutesG,
    personalBaseline,
    goalsBaseline,
    profile?.id,
    formInitialized,
    goalsInitialized,
  ]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingConfirmed.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveAction(() => () => {
        discardStoredDraft();
        if (url.origin === location.origin)
          router.push(url.pathname + url.search + url.hash);
        else location.assign(url.href);
      });
    };
    // The Navigation API can cancel SPA Back/Forward before the route unmounts.
    // Older browsers retain non-sensitive drafts in sessionStorage instead.
    type TraverseEvent = Event & {
      navigationType?: string;
      destination?: { url: string; key: string };
    };
    type ProfileNavigation = {
      addEventListener: (
        name: string,
        listener: (event: Event) => void,
      ) => void;
      removeEventListener: (
        name: string,
        listener: (event: Event) => void,
      ) => void;
      traverseTo: (key: string) => unknown;
    };
    const navigation = (window as unknown as { navigation?: ProfileNavigation })
      .navigation;
    const navigate = (raw: Event) => {
      const event = raw as TraverseEvent;
      if (
        leavingConfirmed.current ||
        event.navigationType !== "traverse" ||
        !event.cancelable ||
        !event.destination
      )
        return;
      const destination = event.destination;
      const url = new URL(destination.url, location.href);
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      event.preventDefault();
      setLeaveAction(() => () => {
        discardStoredDraft();
        navigation?.traverseTo(destination.key);
      });
    };
    navigation?.addEventListener("navigate", navigate);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", navigate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, router, profile?.id]);
  function discardStoredDraft() {
    leavingConfirmed.current = true;
    try {
      if (profile) {
        sessionStorage.removeItem(`tj-profile-draft:${profile.id}`);
        sessionStorage.removeItem(`tj-profile-models-draft:${profile.id}`);
      }
    } catch {}
  }
  function requestLeave(action: () => void) {
    if (dirty)
      setLeaveAction(() => () => {
        discardStoredDraft();
        action();
      });
    else {
      discardStoredDraft();
      action();
    }
  }

  /* ── AI Config ── */
  const { data: aiConfigs } = trpc.aiConfig.list.useQuery();
  const upsertAiConfigMut = trpc.aiConfig.upsert.useMutation({
    onSuccess: () => {
      utils.aiConfig.list.invalidate();
      utils.aiConfig.models.invalidate();
      utils.aiConfig.diagnostics.invalidate();
      setEditingProvider(null);
      setAiKeyInput("");
      toast.success("API key guardada correctamente");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });
  const deleteAiConfigMut = trpc.aiConfig.delete.useMutation({
    onSuccess: () => {
      utils.aiConfig.list.invalidate();
      utils.aiConfig.models.invalidate();
      utils.aiConfig.diagnostics.invalidate();
      toast.success("API key eliminada");
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  });

  // Tests a SAVED provider key against the real provider API (/api/ai-test).
  // Surfaces the real error returned by the provider — not a generic message.
  async function testConnection(
    provider: "anthropic" | "openrouter" | "openai",
  ) {
    setTestingProvider(provider);
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        error?: string;
      };
      if (data.valid) toast.success(`Conexión exitosa con ${provider} ✓`);
      else
        toast.error(`Falló la conexión: ${data.error ?? "error desconocido"}`);
    } catch (e) {
      toast.error(
        `No se pudo probar la conexión: ${e instanceof Error ? e.message : "error de red"}`,
      );
    } finally {
      utils.aiConfig.list.invalidate();
      setTestingProvider(null);
    }
  }

  /* ── Handlers ── */
  function handleSaveProfile() {
    if (!profile) return;
    const baseline = JSON.parse(personalBaseline) as typeof personalValues;
    const patch: {
      name?: string;
      timezone?: string;
      language?: "es" | "en";
      baseCurrency?: string;
      fxRates?: Record<string, number>;
    } = {};
    if (name !== baseline.name) patch.name = name;
    if (timezone !== baseline.timezone) patch.timezone = timezone;
    if (language !== baseline.language)
      patch.language = language as "es" | "en";
    if (baseCurrency !== baseline.baseCurrency)
      patch.baseCurrency = baseCurrency;
    try {
      const parsed: Record<string, number> = {};
      for (const [currency, raw] of Object.entries(fxRates)) {
        const value = parseProfileNumber(raw, { min: Number.MIN_VALUE });
        if (value != null) parsed[currency] = value;
      }
      if (JSON.stringify(fxRates) !== JSON.stringify(baseline.fxRates))
        patch.fxRates = parsed;
      setFormError("");
    } catch {
      setFormError(
        "Revisa las tasas FX: deben ser números positivos. Usa punto o coma decimal.",
      );
      return;
    }
    if (Object.keys(patch).length === 0) {
      toast.info("Sin cambios para guardar");
      return;
    }
    updateMut.mutate(patch);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      await downloadProfileExport(
        (input) => utils.profile.exportPage.fetch(input),
        (progress) =>
          setExportProgress(
            `${progress.label}: ${progress.records} registros · ${progress.completedSections}/${progress.totalSections} secciones`,
          ),
      );
      toast.success("Datos exportados correctamente");
    } catch {
      toast.error("Error al exportar datos");
    } finally {
      setExportLoading(false);
    }
  }

  function handleSaveGoals() {
    try {
      const values = {
        disciplineGoal: parseProfileNumber(disciplineGoal, {
          integer: true,
          min: 0,
          max: 100,
        }),
        weeklyTradesGoal: parseProfileNumber(weeklyTradesGoal, {
          integer: true,
          min: 0,
          max: 500,
        }),
        weeklyPnlGoal: parseProfileNumber(weeklyPnlGoal, {
          min: 0,
          max: 1000000,
        }),
        weeklyGoalMinutes: parseProfileNumber(weeklyGoalMinutesG, {
          integer: true,
          min: 0,
          max: 10080,
        }),
      };
      setGoalsError("");
      const baseline = JSON.parse(goalsBaseline) as typeof goalValues;
      const patch: Partial<typeof values> = {};
      if (disciplineGoal !== baseline.disciplineGoal)
        patch.disciplineGoal = values.disciplineGoal;
      if (weeklyTradesGoal !== baseline.weeklyTradesGoal)
        patch.weeklyTradesGoal = values.weeklyTradesGoal;
      if (weeklyPnlGoal !== baseline.weeklyPnlGoal)
        patch.weeklyPnlGoal = values.weeklyPnlGoal;
      if (weeklyGoalMinutesG !== baseline.weeklyGoalMinutesG)
        patch.weeklyGoalMinutes = values.weeklyGoalMinutes;
      setGoalsMut.mutate(patch);
    } catch {
      setGoalsError(
        "Revisa las metas: disciplina 0–100, trades 0–500, P&L 0–1.000.000 y minutos 0–10.080. Solo P&L admite decimales.",
      );
    }
  }

  /* ── Render ── */
  if (isLoading) {
    return (
      <div className="main-content">
        <TopBar title="Perfil" subtitle="Cargando…" />
        <ProfileSkeleton />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="main-content">
        <TopBar title="Perfil" subtitle="Error" />
        <p style={{ color: "var(--loss)", padding: 24 }}>
          No se pudo cargar el perfil. Intenta recargar la página.
        </p>
      </div>
    );
  }

  const theme = prefs?.theme ?? "system";
  const colorScheme = prefs?.colorScheme ?? "default";
  const emailNotifications = profile.emailNotifications ?? true;
  const timezoneOptions = Array.from(
    new Set([
      ...TIMEZONES,
      ...((
        Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.("timeZone") ?? []),
      timezone,
    ]),
  )
    .sort()
    .filter(
      (zone) =>
        zone === timezone ||
        zone.toLowerCase().includes(timezoneSearch.toLowerCase()),
    );
  const memberSince = new Date(profile.createdAt).toLocaleDateString("es-HN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="main-content">
      <TopBar
        title="Perfil"
        subtitle={`Preferencias del trader · ${profile.timezone}`}
      />

      <div
        style={{
          maxWidth: 780,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* ── Header: Avatar + Stats ── */}
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
              }}
            />
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                {profile.name || "Sin nombre"}
              </p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                {profile.email}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                {[
                  { label: "Miembro desde", value: memberSince },
                  {
                    label: "Racha actual",
                    value: `${profile.currentStreak} días`,
                  },
                  { label: "Mejor racha", value: `${profile.bestStreak} días` },
                ].map((s) => (
                  <div key={s.label}>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      {s.label}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ink)",
                        marginTop: 2,
                      }}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <nav
          aria-label="Secciones del perfil"
          className="flex flex-wrap gap-2 sticky top-0 z-10 bg-[var(--bg)] py-2"
        >
          {[
            "Datos",
            "Metas",
            "Apariencia",
            "Notificaciones",
            "IA",
            "Seguridad",
          ].map((section) => (
            <Button
              key={section}
              variant={activeSection === section ? "primary" : "ghost"}
              aria-current={activeSection === section ? "page" : undefined}
              onClick={() => setActiveSection(section)}
            >
              {section}
            </Button>
          ))}
        </nav>
        {recoveredDraft && (
          <p role="status" className="text-sm text-[var(--accent)]">
            Borrador recuperado. Revísalo antes de guardar.
          </p>
        )}
        <section
          hidden={activeSection !== "Datos"}
          aria-label="Datos"
          className="space-y-4"
        >
          {/* ── Datos personales ── */}
          <Card>
            <SectionTitle>Datos personales</SectionTitle>
            <fieldset
              disabled={updateMut.isPending}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <Field label="Nombre">
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="Tu nombre"
                />
              </Field>
              <Field label="Email">
                <TextInput value={profile.email} disabled placeholder="Email" />
              </Field>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div className="space-y-2">
                  <Field label="Buscar zona horaria">
                    <TextInput
                      value={timezoneSearch}
                      onChange={setTimezoneSearch}
                      placeholder="Ciudad o región"
                    />
                  </Field>
                  <Field label="Zona horaria">
                    <select
                      className="focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      style={{
                        height: 38,
                        padding: "0 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--ink)",
                        fontSize: 13,
                        outline: "none",
                        width: "100%",
                      }}
                    >
                      {timezoneOptions.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Idioma">
                  <select
                    className="focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "es" | "en")}
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--panel-2)",
                      color: "var(--ink)",
                      fontSize: 13,
                      outline: "none",
                      width: "100%",
                    }}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="Moneda base">
                  <TextInput
                    value={baseCurrency}
                    onChange={(v) => setBaseCurrency(v.toUpperCase())}
                    placeholder="USD"
                  />
                </Field>
              </div>

              {/* ── Tasas de cambio (FX) ── */}
              <div style={{ marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    color: "var(--ink-3)",
                    marginBottom: 4,
                  }}
                >
                  Tasas de cambio (FX)
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginBottom: 12,
                  }}
                >
                  El dashboard convierte cada cuenta a tu moneda base. Define el
                  valor de 1 unidad en USD. Déjalo vacío para usar el valor por
                  defecto.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                  }}
                >
                  {SUPPORTED_CURRENCIES.filter((c) => c !== "USD").map(
                    (cur) => (
                      <Field key={cur} label={`1 ${cur} = ? USD`}>
                        <TextInput
                          value={
                            fxRates[cur] != null ? String(fxRates[cur]) : ""
                          }
                          placeholder={String(USD_VALUE[cur])}
                          inputMode="decimal"
                          onChange={(value) =>
                            setFxRates((previous) => ({
                              ...previous,
                              [cur]: value,
                            }))
                          }
                        />
                      </Field>
                    ),
                  )}
                </div>
              </div>
            </fieldset>
            <div style={{ marginTop: 20 }}>
              <p role="status" className="mb-2 text-xs text-[var(--ink-3)]">
                {personalDirty ? "Cambios sin guardar" : "Guardado"} · Guardado
                manual
              </p>
              {formError && (
                <p role="alert" className="mb-2 text-sm text-[var(--loss)]">
                  {formError}
                </p>
              )}
              <PrimaryBtn
                onClick={handleSaveProfile}
                loading={updateMut.isPending}
                disabled={!formInitialized || !personalDirty}
              >
                Guardar cambios
              </PrimaryBtn>
              <GhostBtn
                className="ml-2"
                disabled={!personalDirty || updateMut.isPending}
                onClick={() => {
                  loadPersonal(profile);
                  setFormError("");
                  setRecoveredDraft(false);
                }}
              >
                Cancelar cambios
              </GhostBtn>
            </div>
          </Card>

          {/* ── Sesiones de trading ── */}
          <Card>
            <SectionTitle>Sesiones de trading</SectionTitle>
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                marginTop: -14,
                marginBottom: 16,
              }}
            >
              Clasificación aproximada según la hora de apertura registrada, sin
              conversión de zona horaria. Puedes corregir la sesión en cada
              trade; estos rangos no cambian al elegir otra zona en el perfil.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {SESSIONS.map((s) => (
                <div
                  key={s.key}
                  style={{
                    padding: "14px 16px",
                    background: "var(--panel-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      color: "var(--ink-3)",
                      marginBottom: 10,
                    }}
                  >
                    {s.key}
                  </p>
                  <p
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {s.start} – {s.end}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
        <section hidden={activeSection !== "Metas"} aria-label="Metas">
          {/* ── Metas semanales ── */}
          <Card>
            <SectionTitle>Metas semanales</SectionTitle>
            {goalsQuery.isError && (
              <p role="alert">
                No se pudieron cargar tus metas.{" "}
                <Button onClick={() => goalsQuery.refetch()}>Reintentar</Button>
              </p>
            )}
            <fieldset
              disabled={setGoalsMut.isPending || !goalsData}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="Meta de disciplina (0–100)">
                  <TextInput
                    value={disciplineGoal}
                    inputMode="numeric"
                    onChange={setDisciplineGoal}
                    placeholder="80"
                  />
                </Field>
                <Field label="Trades por semana">
                  <TextInput
                    value={weeklyTradesGoal}
                    inputMode="numeric"
                    onChange={setWeeklyTradesGoal}
                    placeholder="Sin meta"
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="P&L semanal ($)">
                  <TextInput
                    value={weeklyPnlGoal}
                    inputMode="decimal"
                    onChange={setWeeklyPnlGoal}
                    placeholder="Sin meta"
                  />
                </Field>
                <Field label="Minutos de aprendizaje/semana">
                  <TextInput
                    value={weeklyGoalMinutesG}
                    inputMode="numeric"
                    onChange={setWeeklyGoalMinutesG}
                    placeholder="300"
                  />
                </Field>
              </div>
            </fieldset>
            <div style={{ marginTop: 20 }}>
              <p role="status" className="mb-2 text-xs text-[var(--ink-3)]">
                {goalsDirty ? "Cambios sin guardar" : "Guardado"} · Guardado
                manual
              </p>
              {goalsError && (
                <p role="alert" className="mb-2 text-sm text-[var(--loss)]">
                  {goalsError}
                </p>
              )}
              <PrimaryBtn
                onClick={handleSaveGoals}
                loading={setGoalsMut.isPending}
                disabled={!goalsData || !goalsInitialized || !goalsDirty}
              >
                Guardar metas
              </PrimaryBtn>
              <GhostBtn
                className="ml-2"
                disabled={!goalsDirty || setGoalsMut.isPending}
                onClick={() => {
                  if (goalsData) loadGoals(goalsData);
                  setGoalsError("");
                  setRecoveredDraft(false);
                }}
              >
                Cancelar metas
              </GhostBtn>
            </div>
          </Card>
        </section>
        <section
          hidden={activeSection !== "Apariencia"}
          aria-label="Apariencia"
        >
          {/* ── Apariencia ── */}
          <Card>
            <SectionTitle>Apariencia</SectionTitle>
            {prefsQuery.isError && (
              <p role="alert">
                No se pudo cargar la apariencia.{" "}
                <Button onClick={() => prefsQuery.refetch()}>Reintentar</Button>
              </p>
            )}
            <p role="status" className="mb-4 text-xs text-[var(--ink-3)]">
              {updatePrefsMut.isPending
                ? "Guardando…"
                : "Guardado automático al seleccionar"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--ink-3)",
                  marginBottom: 8,
                }}
              >
                Tema
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={t}
                    disabled={updatePrefsMut.isPending || !prefs}
                    aria-pressed={theme === t}
                    onClick={() => {
                      updatePrefsMut.mutate({ theme: t });
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border:
                        theme === t
                          ? "2px solid var(--accent)"
                          : "1px solid var(--line)",
                      background:
                        theme === t ? "var(--accent-soft)" : "var(--panel-2)",
                      color: theme === t ? "var(--accent)" : "var(--ink-2)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {t === "light"
                      ? "Claro"
                      : t === "dark"
                        ? "Oscuro"
                        : "Sistema"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Full-palette studio: predefined palettes + custom library + creator modal */}
            <PaletteStudio />

            {/* Colorblind mode */}
            <div style={{ marginTop: 20 }}>
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
                Modo de color
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORBLIND_OPTIONS.map(({ value, label }) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={value}
                    disabled={updatePrefsMut.isPending || !prefs}
                    aria-pressed={colorScheme === value}
                    onClick={() => {
                      updatePrefsMut.mutate({
                        colorScheme: value as
                          | "default"
                          | "deuteranopia"
                          | "mono",
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border:
                        colorScheme === value
                          ? "2px solid var(--accent)"
                          : "1px solid var(--line)",
                      background:
                        colorScheme === value
                          ? "var(--accent-soft)"
                          : "var(--panel-2)",
                      color:
                        colorScheme === value
                          ? "var(--accent)"
                          : "var(--ink-2)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </section>
        <section
          hidden={activeSection !== "Notificaciones"}
          aria-label="Notificaciones"
        >
          {/* ── Notificaciones ── */}
          <Card>
            <SectionTitle>Notificaciones</SectionTitle>
            {notifQuery.isError && (
              <p role="alert">
                No se pudieron cargar las preferencias.{" "}
                <Button onClick={() => notifQuery.refetch()}>Reintentar</Button>
              </p>
            )}
            <p role="status" className="mb-4 text-xs text-[var(--ink-3)]">
              {updateMut.isPending || updateNotifPref.isPending
                ? "Guardando…"
                : "Guardado automático"}
            </p>
            <ToggleRow
              label="Email · notificaciones"
              sub="Interruptor maestro de todos los correos. Si lo apagas, no recibes ninguno."
              on={emailNotifications}
              disabled={updateMut.isPending}
              onChange={(v) => updateMut.mutate({ emailNotifications: v })}
            />
            <ToggleRow
              label="Email · Aprendizaje"
              sub="Resumen diario con repasos vencidos, racha en riesgo y progreso."
              on={emailNotifications && aprendizajeEmailOn}
              disabled={
                !emailNotifications || updateNotifPref.isPending || !notifPrefs
              }
              onChange={setAprendizajeEmail}
            />
            <LearningReminderSettings
              time={profile?.learningReminderTime ?? "19:00"}
              timezone={profile?.timezone ?? "UTC"}
              emailEnabled={emailNotifications && aprendizajeEmailOn}
            />
            <ToggleRow
              label="Email · Reviews"
              sub="Resumen semanal (lunes) y mensual (día 1) de tu trading con análisis IA y PDF."
              on={emailNotifications && reviewsEmailOn}
              disabled={
                !emailNotifications || updateNotifPref.isPending || !notifPrefs
              }
              onChange={setReviewsEmail}
            />

            <ToggleRow
              label="Email · Fiscalidad"
              sub="Avisos de nuevas reglas ISR publicadas, con los cambios y su fuente oficial. Requiere un perfil fiscal de Honduras; respeta el horario de silencio de la categoría."
              on={emailNotifications && fiscalChannels.includes("email")}
              disabled={
                !emailNotifications || updateNotifPref.isPending || !notifPrefs
              }
              onChange={setFiscalEmail}
            />
            {/* Delivery test — verifies email actually arrives, independent of the digests. */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
              }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => testEmailMut.mutate()}
                disabled={testEmailMut.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--panel-2)",
                  color: "var(--ink-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: testEmailMut.isPending ? "default" : "pointer",
                  opacity: testEmailMut.isPending ? 0.6 : 1,
                }}
              >
                {testEmailMut.isPending
                  ? "Enviando…"
                  : "Enviar correo de prueba"}
              </Button>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
                Te enviamos un correo de prueba a <b>{profile.email}</b> para
                confirmar que la entrega funciona.
              </p>
            </div>
          </Card>
        </section>
        <section
          hidden={activeSection !== "IA"}
          aria-label="IA"
          className="space-y-4"
        >
          {/* ── Configuración de IA ── */}
          <Card>
            <SectionTitle>Configuración de IA</SectionTitle>
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                marginTop: -14,
                marginBottom: 16,
              }}
            >
              Configura tu propia API key para usar el coach de IA. Las claves
              se cifran con AES-256-GCM.
            </p>

            {AI_PROVIDERS.map(({ id, label, placeholder, hint }) => {
              const config = aiConfigs?.find(
                (c: { provider: string }) => c.provider === id,
              );
              const isEditing = editingProvider === id;

              return (
                <div
                  key={id}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: isEditing ? 12 : 0,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {label}
                      </p>
                      {config && !isEditing && (
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "var(--ink-3)",
                            marginTop: 2,
                            fontFamily:
                              "'JetBrains Mono','Cascadia Code',monospace",
                          }}
                        >
                          {config.maskedKey}
                          {config.lastTested &&
                            ` · Probado ${new Date(config.lastTested).toLocaleDateString("es-HN")}`}
                        </p>
                      )}
                      {!config && !isEditing && (
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          Sin configurar
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {config && !isEditing && (
                        <GhostBtn
                          onClick={() =>
                            testConnection(
                              id as "anthropic" | "openrouter" | "openai",
                            )
                          }
                          loading={testingProvider === id}
                        >
                          Probar conexión
                        </GhostBtn>
                      )}
                      {!isEditing && (
                        <GhostBtn
                          disabled={Boolean(editingProvider && aiKeyInput)}
                          onClick={() => {
                            setEditingProvider(id);
                            setAiKeyInput("");
                          }}
                        >
                          {config ? "Editar" : "Agregar"}
                        </GhostBtn>
                      )}
                      {config && !isEditing && (
                        <DangerBtn
                          onClick={() =>
                            setDeleteProvider(
                              id as "anthropic" | "openrouter" | "openai",
                            )
                          }
                        >
                          Eliminar
                        </DangerBtn>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <p style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {hint}
                      </p>
                      <Input
                        aria-label={`API key de ${label}`}
                        autoComplete="off"
                        type="password"
                        value={aiKeyInput}
                        onChange={(e) => setAiKeyInput(e.target.value)}
                        placeholder={placeholder}
                        style={{
                          height: 38,
                          padding: "0 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--line)",
                          background: "var(--panel-2)",
                          color: "var(--ink)",
                          fontSize: 13,
                          outline: "none",
                          width: "100%",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <PrimaryBtn
                          onClick={() =>
                            upsertAiConfigMut.mutate({
                              provider: id as
                                | "anthropic"
                                | "openrouter"
                                | "openai",
                              apiKey: aiKeyInput,
                            })
                          }
                          loading={upsertAiConfigMut.isPending}
                          disabled={aiKeyInput.length < 20}
                        >
                          Guardar clave
                        </PrimaryBtn>
                        <GhostBtn
                          onClick={() => {
                            setEditingProvider(null);
                            setAiKeyInput("");
                          }}
                        >
                          Cancelar
                        </GhostBtn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {/* ── Modelos de IA (config ampliada) ── */}
          <AiModelsCard
            onDirtyChange={setModelsDirty}
            userId={profile.id}
            timezone={profile.timezone ?? "UTC"}
          />
        </section>
        <section
          hidden={activeSection !== "Seguridad"}
          aria-label="Seguridad"
          className="space-y-4"
        >
          {/* ── Seguridad ── */}
          {showPasswordForm && (
            <Card>
              <SectionTitle>Cambiar contraseña</SectionTitle>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <Field label="Nueva contraseña">
                  <Input
                    autoComplete="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--panel-2)",
                      color: "var(--ink)",
                      fontSize: 13,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </Field>
                <div style={{ display: "flex", gap: 10 }}>
                  <PrimaryBtn
                    onClick={() => changePasswordMut.mutate({ newPassword })}
                    loading={changePasswordMut.isPending}
                    disabled={newPassword.length < 8}
                  >
                    Actualizar contraseña
                  </PrimaryBtn>
                  <GhostBtn
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                    }}
                  >
                    Cancelar
                  </GhostBtn>
                </div>
              </div>
            </Card>
          )}

          {/* ── Sesión y datos ── */}
          <Card>
            <SectionTitle>Sesión y datos</SectionTitle>
            <p className="mb-3 text-xs text-[var(--ink-3)]">
              La exportación contiene tus registros, incluido aprendizaje y
              prácticas. Excluye claves y archivos de imágenes; incluye sus
              referencias.
            </p>
            {exportLoading && (
              <p role="status" className="mb-3 text-xs">
                {exportProgress || "Preparando exportación…"}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {!showPasswordForm && (
                <GhostBtn onClick={() => setShowPasswordForm(true)}>
                  Cambiar contraseña
                </GhostBtn>
              )}
              <GhostBtn onClick={handleExport} loading={exportLoading}>
                Exportar datos (JSON)
              </GhostBtn>
              <GhostBtn onClick={() => requestLeave(handleSignOut)}>
                Cerrar sesión
              </GhostBtn>
              <DangerBtn
                onClick={() => setConfirmDelete(true)}
                loading={deleteMut.isPending}
              >
                Borrar cuenta
              </DangerBtn>
            </div>
          </Card>
        </section>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="¿Eliminar cuenta permanentemente?"
          description="Se eliminarán tu acceso, registros e imágenes. Si la limpieza no termina inmediatamente, continuará en segundo plano. Esta acción es irreversible."
          confirmLabel="Sí, eliminar todo"
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
        />
        <ConfirmDialog
          open={deleteProvider != null}
          onOpenChange={(open) => {
            if (!open) setDeleteProvider(null);
          }}
          title="¿Eliminar esta API key?"
          description="Dejará de estar disponible para las funciones de IA."
          onConfirm={() => {
            if (deleteProvider)
              deleteAiConfigMut.mutate(
                { provider: deleteProvider },
                { onSuccess: () => setDeleteProvider(null) },
              );
          }}
          loading={deleteAiConfigMut.isPending}
        />
        <ConfirmDialog
          open={leaveAction != null}
          onOpenChange={(open) => {
            if (!open) setLeaveAction(null);
          }}
          title="Cambios sin guardar"
          description="Tienes cambios pendientes en Perfil. ¿Quieres salir y descartarlos?"
          confirmLabel="Descartar y salir"
          destructive={false}
          onConfirm={() => {
            const action = leaveAction;
            setLeaveAction(null);
            action?.();
          }}
        />
      </div>
    </div>
  );
}
