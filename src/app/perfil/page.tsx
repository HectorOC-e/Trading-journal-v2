"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/layout/top-bar"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { createClient } from "@/lib/supabase/client"
import { Loader2, RotateCcw } from "lucide-react"
import { AiModelsCard } from "./components/ai-models-card"
import {
  PREDEFINED_THEMES, applyColorTheme, customFromHue, parseCustomTheme,
  DEFAULT_CUSTOM, type ColorTheme, type CustomTheme,
} from "@/lib/themes"

/* ── Inline primitives ─────────────────────────────────────────────── */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? "var(--win)" : "var(--line-2)",
        border: "none", cursor: "pointer", flexShrink: 0,
        position: "relative", transition: "background .2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "white",
        transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
      }} />
    </button>
  )
}

function Card({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: `1px solid ${danger ? "var(--loss)" : "var(--line)"}`,
      borderRadius: "var(--radius)",
      padding: "24px",
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 20 }}>
      {children}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        height: 38, padding: "0 12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--line)",
        background: disabled ? "var(--panel)" : "var(--panel-2)",
        color: "var(--ink)", fontSize: 13,
        outline: "none", width: "100%",
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

function ToggleRow({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{label}</p>
        {sub && <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{sub}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

function PrimaryBtn({ children, onClick, loading, disabled }: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
        background: "var(--accent)", color: "white",
        fontSize: 13, fontWeight: 600, border: "none",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        opacity: loading || disabled ? 0.7 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick, loading, disabled }: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
        background: "var(--chip)", color: "var(--ink-2)",
        fontSize: 13, fontWeight: 500, border: "1px solid var(--line)",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        opacity: loading || disabled ? 0.7 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}

function DangerBtn({ children, onClick, loading }: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
        background: "var(--loss-soft)", color: "var(--loss)",
        fontSize: 13, fontWeight: 600, border: "1px solid var(--loss)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 16 }}>
      {[120, 200, 100, 180, 120, 100].map((h, i) => (
        <div key={i} className="animate-pulse" style={{
          height: h,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          opacity: 0.6,
        }} />
      ))}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
const ACCENT_PRESETS = [
  { hue: 0,   label: "Rojo" },
  { hue: 30,  label: "Naranja" },
  { hue: 60,  label: "Amarillo" },
  { hue: 120, label: "Verde" },
  { hue: 200, label: "Teal" },
  { hue: 240, label: "Azul" },
  { hue: 280, label: "Morado" },
  { hue: 320, label: "Rosa" },
]

const COLORBLIND_OPTIONS = [
  { value: "default",      label: "Normal" },
  { value: "deuteranopia", label: "Deuteranopia" },
  { value: "mono",         label: "Monocromo" },
]

const AI_PROVIDERS = [
  { id: "anthropic",  label: "Anthropic (Claude)", placeholder: "sk-ant-...", hint: "Obtén tu clave en console.anthropic.com" },
  { id: "openrouter", label: "OpenRouter",         placeholder: "sk-or-...",  hint: "Obtén tu clave en openrouter.ai/keys" },
  { id: "openai",     label: "OpenAI",             placeholder: "sk-...",     hint: "Obtén tu clave en platform.openai.com/api-keys" },
]

const SESSIONS = [
  { key: "ASIA",    start: "18:00", end: "02:00" },
  { key: "LONDON",  start: "02:00", end: "05:00" },
  { key: "NY AM",   start: "07:30", end: "10:30" },
  { key: "NY PM",   start: "13:00", end: "16:00" },
]

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
]

export default function PerfilPage() {
  const utils   = trpc.useUtils()
  const router  = useRouter()

  /* ── Server data ── */
  const { data: profile, isLoading, isError } = trpc.profile.get.useQuery()
  const { data: prefs } = trpc.preferences.get.useQuery()

  /* ── Local form state — initialized from server data ── */
  const [name,               setName]               = useState("")
  const [timezone,           setTimezone]           = useState("")
  const [language,           setLanguage]           = useState<"es" | "en">("es")
  const [baseCurrency,       setBaseCurrency]       = useState("")
  const [weeklyGoalMinutes,  setWeeklyGoalMinutes]  = useState(300)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [formInitialized,    setFormInitialized]    = useState(false)
  const [theme,              setThemeState]         = useState<"light" | "dark" | "system">("system")
  const [colorTheme,         setColorTheme]         = useState<ColorTheme>("indigo")
  const [customTheme,        setCustomTheme]        = useState<CustomTheme>(DEFAULT_CUSTOM)
  const [colorScheme,        setColorScheme]        = useState<"default" | "deuteranopia" | "mono">("default")
  const [disciplineGoal,     setDisciplineGoal]     = useState<number | undefined>(undefined)
  const [weeklyTradesGoal,   setWeeklyTradesGoal]   = useState<number | null>(null)
  const [weeklyPnlGoal,      setWeeklyPnlGoal]      = useState<number | null>(null)
  const [weeklyGoalMinutesG, setWeeklyGoalMinutesG] = useState<number | null>(null)
  const [editingProvider,    setEditingProvider]    = useState<string | null>(null)
  const [aiKeyInput,         setAiKeyInput]         = useState("")
  const [testingProvider,    setTestingProvider]    = useState<string | null>(null)

  // Initialize local state once on first data load (useEffect avoids calling setState during render)
  useEffect(() => {
    if (!profile || formInitialized) return
    setName(profile.name ?? "")
    setTimezone(profile.timezone ?? "America/Tegucigalpa")
    setLanguage((profile.language as "es" | "en") ?? "es")
    setBaseCurrency(profile.baseCurrency ?? "USD")
    setWeeklyGoalMinutes(profile.weeklyGoalMinutes ?? 300)
    setEmailNotifications(profile.emailNotifications ?? true)
    setFormInitialized(true)
  }, [profile, formInitialized])

  useEffect(() => {
    if (prefs) {
      setThemeState(prefs.theme as "light" | "dark" | "system")
      setColorTheme((prefs.colorTheme as ColorTheme) ?? "indigo")
      setCustomTheme(parseCustomTheme(prefs.customTheme) ?? DEFAULT_CUSTOM)
      setColorScheme((prefs.colorScheme as "default" | "deuteranopia" | "mono") ?? "default")
    }
  }, [prefs])

  /* ── Theme handlers ── */
  function pickTheme(id: ColorTheme) {
    setColorTheme(id)
    applyColorTheme(id, id === "custom" ? customTheme : null)
    localStorage.setItem("tj-color-theme", id)
    updatePrefsMut.mutate({ colorTheme: id })
  }

  function pickCustomHue(hue: number) {
    const next = customFromHue(hue)
    setCustomTheme(next)
    setColorTheme("custom")
    applyColorTheme("custom", next)
    const json = JSON.stringify(next)
    localStorage.setItem("tj-color-theme", "custom")
    localStorage.setItem("tj-custom-theme", json)
    updatePrefsMut.mutate({ colorTheme: "custom", customTheme: json })
  }

  function restoreDefaultTheme() {
    setColorTheme("indigo")
    setCustomTheme(DEFAULT_CUSTOM)
    applyColorTheme("indigo", null)
    document.documentElement.style.removeProperty("--accent")
    document.documentElement.style.removeProperty("--accent-soft")
    localStorage.setItem("tj-color-theme", "indigo")
    localStorage.removeItem("tj-custom-theme")
    updatePrefsMut.mutate({ colorTheme: "indigo", customTheme: null, accentHue: null })
    toast.success("Tema restaurado a Indigo")
  }

  /* ── Password modal state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword,      setNewPassword]      = useState("")

  /* ── Delete confirmation ── */
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [exportLoading,  setExportLoading]  = useState(false)

  /* ── Mutations ── */
  const updateMut = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate()
      toast.success("Perfil actualizado correctamente")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const changePasswordMut = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente")
      setShowPasswordForm(false)
      setNewPassword("")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const deleteMut = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Cuenta eliminada. Serás redirigido.")
      setTimeout(() => { window.location.href = "/login" }, 2000)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const updatePrefsMut = trpc.preferences.update.useMutation({
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  /* ── Goals ── */
  const { data: goalsData } = trpc.goals.get.useQuery()
  const setGoalsMut = trpc.goals.set.useMutation({
    onSuccess: () => toast.success("Metas actualizadas"),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  useEffect(() => {
    if (!goalsData) return
    setDisciplineGoal(goalsData.disciplineGoal ?? undefined)
    setWeeklyTradesGoal(goalsData.weeklyTradesGoal ?? null)
    setWeeklyPnlGoal(goalsData.weeklyPnlGoal ?? null)
    setWeeklyGoalMinutesG(goalsData.weeklyGoalMinutes ?? null)
  }, [goalsData])

  /* ── AI Config ── */
  const { data: aiConfigs } = trpc.aiConfig.list.useQuery()
  const upsertAiConfigMut = trpc.aiConfig.upsert.useMutation({
    onSuccess: () => {
      utils.aiConfig.list.invalidate()
      setEditingProvider(null)
      setAiKeyInput("")
      toast.success("API key guardada correctamente")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })
  const deleteAiConfigMut = trpc.aiConfig.delete.useMutation({
    onSuccess: () => {
      utils.aiConfig.list.invalidate()
      toast.success("API key eliminada")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  // Tests a SAVED provider key against the real provider API (/api/ai-test).
  // Surfaces the real error returned by the provider — not a generic message.
  async function testConnection(provider: "anthropic" | "openrouter" | "openai") {
    setTestingProvider(provider)
    try {
      const res = await fetch("/api/ai-test", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({})) as { valid?: boolean; error?: string }
      if (data.valid) toast.success(`Conexión exitosa con ${provider} ✓`)
      else            toast.error(`Falló la conexión: ${data.error ?? "error desconocido"}`)
    } catch (e) {
      toast.error(`No se pudo probar la conexión: ${e instanceof Error ? e.message : "error de red"}`)
    } finally {
      utils.aiConfig.list.invalidate()
      setTestingProvider(null)
    }
  }

  /* ── Handlers ── */
  function handleSaveProfile() {
    if (!profile) return
    const patch: {
      name?: string; timezone?: string; language?: "es" | "en"
      baseCurrency?: string; weeklyGoalMinutes?: number; emailNotifications?: boolean
    } = {}
    if (name              !== (profile.name               ?? ""))    patch.name               = name
    if (timezone          !== (profile.timezone            ?? ""))    patch.timezone           = timezone
    if (language          !== (profile.language            ?? "es"))  patch.language           = language as "es" | "en"
    if (baseCurrency      !== (profile.baseCurrency        ?? ""))    patch.baseCurrency       = baseCurrency
    if (weeklyGoalMinutes !== (profile.weeklyGoalMinutes   ?? 300))   patch.weeklyGoalMinutes  = weeklyGoalMinutes
    if (emailNotifications !== (profile.emailNotifications ?? true))  patch.emailNotifications = emailNotifications
    if (Object.keys(patch).length === 0) {
      toast.info("Sin cambios para guardar")
      return
    }
    updateMut.mutate(patch)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  async function handleExport() {
    setExportLoading(true)
    try {
      const data = await utils.profile.exportData.fetch()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `trading-journal-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Datos exportados correctamente")
    } catch {
      toast.error("Error al exportar datos")
    } finally {
      setExportLoading(false)
    }
  }

  function handleSaveGoals() {
    setGoalsMut.mutate({
      disciplineGoal:    disciplineGoal,
      weeklyTradesGoal:  weeklyTradesGoal,
      weeklyPnlGoal:     weeklyPnlGoal,
      weeklyGoalMinutes: weeklyGoalMinutesG,
    })
  }

  /* ── Render ── */
  if (isLoading) {
    return (
      <div className="main-content">
        <TopBar title="Perfil" subtitle="Cargando..." />
        <ProfileSkeleton />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="main-content">
        <TopBar title="Perfil" subtitle="Error" />
        <p style={{ color: "var(--loss)", padding: 24 }}>No se pudo cargar el perfil. Intenta recargar la página.</p>
      </div>
    )
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div className="main-content">
      <TopBar title="Perfil" subtitle={`Preferencias del trader · ${profile.timezone}`} />

      <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header: Avatar + Stats ── */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
            }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{profile.name || "Sin nombre"}</p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{profile.email}</p>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Miembro desde",  value: memberSince },
                  { label: "Racha actual",   value: `${profile.currentStreak} días` },
                  { label: "Mejor racha",    value: `${profile.bestStreak} días` },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Datos personales ── */}
        <Card>
          <SectionTitle>Datos personales</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Nombre">
              <TextInput value={name} onChange={setName} placeholder="Tu nombre" />
            </Field>
            <Field label="Email">
              <TextInput value={profile.email} disabled placeholder="Email" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Timezone">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  style={{
                    height: 38, padding: "0 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    background: "var(--panel-2)",
                    color: "var(--ink)", fontSize: 13,
                    outline: "none", width: "100%",
                  }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </Field>
              <Field label="Idioma">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as "es" | "en")}
                  style={{
                    height: 38, padding: "0 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    background: "var(--panel-2)",
                    color: "var(--ink)", fontSize: 13,
                    outline: "none", width: "100%",
                  }}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Moneda base">
                <TextInput
                  value={baseCurrency}
                  onChange={v => setBaseCurrency(v.toUpperCase())}
                  placeholder="USD"
                />
              </Field>
              <Field label="Meta semanal (minutos)">
                <TextInput
                  value={String(weeklyGoalMinutes)}
                  onChange={v => setWeeklyGoalMinutes(parseInt(v) || 0)}
                  placeholder="300"
                />
              </Field>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <PrimaryBtn onClick={handleSaveProfile} loading={updateMut.isPending}>
              Guardar cambios
            </PrimaryBtn>
          </div>
        </Card>

        {/* ── Sesiones de trading ── */}
        <Card>
          <SectionTitle>Sesiones de trading</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 16 }}>
            Defaults usados para clasificar cada trade por sesión.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {SESSIONS.map(s => (
              <div key={s.key} style={{
                padding: "14px 16px",
                background: "var(--panel-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 10 }}>
                  {s.key}
                </p>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                  {s.start} – {s.end}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Metas semanales ── */}
        <Card>
          <SectionTitle>Metas semanales</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Meta de disciplina (0–100)">
                <TextInput
                  value={String(disciplineGoal ?? "")}
                  onChange={v => setDisciplineGoal(v === "" ? undefined : Math.min(100, Math.max(0, parseInt(v) || 0)))}
                  placeholder="80"
                />
              </Field>
              <Field label="Trades por semana">
                <TextInput
                  value={weeklyTradesGoal != null ? String(weeklyTradesGoal) : ""}
                  onChange={v => setWeeklyTradesGoal(v === "" ? null : parseInt(v) || null)}
                  placeholder="Sin meta"
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="P&L semanal ($)">
                <TextInput
                  value={weeklyPnlGoal != null ? String(weeklyPnlGoal) : ""}
                  onChange={v => setWeeklyPnlGoal(v === "" ? null : parseFloat(v) || null)}
                  placeholder="Sin meta"
                />
              </Field>
              <Field label="Minutos de aprendizaje/semana">
                <TextInput
                  value={weeklyGoalMinutesG != null ? String(weeklyGoalMinutesG) : ""}
                  onChange={v => setWeeklyGoalMinutesG(v === "" ? null : parseInt(v) || null)}
                  placeholder="300"
                />
              </Field>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <PrimaryBtn onClick={handleSaveGoals} loading={setGoalsMut.isPending}>
              Guardar metas
            </PrimaryBtn>
          </div>
        </Card>

        {/* ── Apariencia ── */}
        <Card>
          <SectionTitle>Apariencia</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 8 }}>
              Tema
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setThemeState(t)
                    updatePrefsMut.mutate({ theme: t })
                    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
                    document.documentElement.classList.toggle("dark", isDark)
                    localStorage.setItem("tj-theme", isDark ? "dark" : "light")
                  }}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    border: theme === t ? "2px solid var(--accent)" : "1px solid var(--line)",
                    background: theme === t ? "var(--accent-soft)" : "var(--panel-2)",
                    color: theme === t ? "var(--accent)" : "var(--ink-2)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "light" ? "Claro" : t === "dark" ? "Oscuro" : "Sistema"}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette / themes */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>
                Paleta de color
              </label>
              <button
                onClick={restoreDefaultTheme}
                title="Restaurar tema por defecto"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  height: 24, padding: "0 9px", borderRadius: 12,
                  background: "var(--chip)", border: "1px solid var(--line)",
                  color: "var(--ink-2)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                <RotateCcw size={11} /> Restaurar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {PREDEFINED_THEMES.map((t) => {
                const active = colorTheme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTheme(t.id)}
                    style={{
                      display: "flex", flexDirection: "column", gap: 8,
                      padding: 10, borderRadius: "var(--radius-sm)", cursor: "pointer",
                      border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                      background: active ? "var(--accent-soft)" : "var(--panel-2)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: t.swatch, flexShrink: 0, boxShadow: "0 0 0 2px var(--panel)" }} />
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: t.surface, border: "1px solid var(--line)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? "var(--accent)" : "var(--ink)" }}>{t.label}</span>
                    </div>
                    <span style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.3 }}>{t.blurb}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom theme — quick multi-role palette via accent hue */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Tema personalizado
            </label>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 10 }}>
              Elige un color primario. Win/Loss (verde/rojo) se mantienen reservados para resultados de trading.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {ACCENT_PRESETS.map(({ hue, label }) => {
                const active = colorTheme === "custom" && customTheme.accent === customFromHue(hue).accent
                return (
                  <button
                    key={hue}
                    title={label}
                    onClick={() => pickCustomHue(hue)}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `oklch(60% 0.2 ${hue})`,
                      border: active ? "3px solid var(--ink)" : "2px solid transparent",
                      cursor: "pointer", outline: "none", flexShrink: 0,
                      boxShadow: active ? "0 0 0 1px var(--panel)" : undefined,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Colorblind mode */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 8 }}>
              Modo de color
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORBLIND_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setColorScheme(value as typeof colorScheme)
                    updatePrefsMut.mutate({ colorScheme: value as "default" | "deuteranopia" | "mono" })
                    document.documentElement.setAttribute("data-color-scheme", value)
                  }}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    border: colorScheme === value ? "2px solid var(--accent)" : "1px solid var(--line)",
                    background: colorScheme === value ? "var(--accent-soft)" : "var(--panel-2)",
                    color: colorScheme === value ? "var(--accent)" : "var(--ink-2)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Notificaciones ── */}
        <Card>
          <SectionTitle>Notificaciones</SectionTitle>
          <ToggleRow
            label="Email · notificaciones"
            sub="Recibe correos de recordatorio y alertas del sistema."
            on={emailNotifications}
            onChange={v => {
              setEmailNotifications(v)
              updateMut.mutate({ emailNotifications: v })
            }}
          />
        </Card>

        {/* ── Configuración de IA ── */}
        <Card>
          <SectionTitle>Configuración de IA</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 16 }}>
            Configura tu propia API key para usar el coach de IA. Las claves se cifran con AES-256-GCM.
          </p>

          {AI_PROVIDERS.map(({ id, label, placeholder, hint }) => {
            const config = aiConfigs?.find((c: { provider: string }) => c.provider === id)
            const isEditing = editingProvider === id

            return (
              <div key={id} style={{
                padding: "16px 0",
                borderBottom: "1px solid var(--line)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isEditing ? 12 : 0 }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</p>
                    {config && !isEditing && (
                      <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, fontFamily: "'JetBrains Mono','Cascadia Code',monospace" }}>
                        {config.maskedKey}
                        {config.lastTested && ` · Probado ${new Date(config.lastTested).toLocaleDateString("es-HN")}`}
                      </p>
                    )}
                    {!config && !isEditing && (
                      <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Sin configurar</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {config && !isEditing && (
                      <GhostBtn
                        onClick={() => testConnection(id as "anthropic" | "openrouter" | "openai")}
                        loading={testingProvider === id}
                      >
                        Probar conexión
                      </GhostBtn>
                    )}
                    {!isEditing && (
                      <GhostBtn onClick={() => { setEditingProvider(id); setAiKeyInput("") }}>
                        {config ? "Editar" : "Agregar"}
                      </GhostBtn>
                    )}
                    {config && !isEditing && (
                      <DangerBtn onClick={() => deleteAiConfigMut.mutate({ provider: id as "anthropic" | "openrouter" | "openai" })}>
                        Eliminar
                      </DangerBtn>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{hint}</p>
                    <input
                      type="password"
                      value={aiKeyInput}
                      onChange={e => setAiKeyInput(e.target.value)}
                      placeholder={placeholder}
                      style={{
                        height: 38, padding: "0 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--ink)", fontSize: 13,
                        outline: "none", width: "100%",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <PrimaryBtn
                        onClick={() => upsertAiConfigMut.mutate({ provider: id as "anthropic" | "openrouter" | "openai", apiKey: aiKeyInput })}
                        loading={upsertAiConfigMut.isPending}
                        disabled={aiKeyInput.length < 20}
                      >
                        Guardar clave
                      </PrimaryBtn>
                      <GhostBtn onClick={() => { setEditingProvider(null); setAiKeyInput("") }}>
                        Cancelar
                      </GhostBtn>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </Card>

        {/* ── Modelos de IA (config ampliada) ── */}
        <AiModelsCard />

        {/* ── Seguridad ── */}
        {showPasswordForm && (
          <Card>
            <SectionTitle>Cambiar contraseña</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Nueva contraseña">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{
                    height: 38, padding: "0 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    background: "var(--panel-2)",
                    color: "var(--ink)", fontSize: 13,
                    outline: "none", width: "100%",
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
                <GhostBtn onClick={() => { setShowPasswordForm(false); setNewPassword("") }}>
                  Cancelar
                </GhostBtn>
              </div>
            </div>
          </Card>
        )}

        {/* ── Sesión y datos ── */}
        <Card>
          <SectionTitle>Sesión y datos</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {!showPasswordForm && (
              <GhostBtn onClick={() => setShowPasswordForm(true)}>
                Cambiar contraseña
              </GhostBtn>
            )}
            <GhostBtn onClick={handleExport} loading={exportLoading}>
              Exportar datos (JSON)
            </GhostBtn>
            <GhostBtn onClick={handleSignOut}>
              Cerrar sesión
            </GhostBtn>
            <DangerBtn onClick={() => setConfirmDelete(true)} loading={deleteMut.isPending}>
              Borrar cuenta
            </DangerBtn>
          </div>
        </Card>

        {/* ── Confirm delete ── */}
        {confirmDelete && (
          <Card danger>
            <SectionTitle>¿Eliminar cuenta permanentemente?</SectionTitle>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16 }}>
              Esta acción es irreversible. Se eliminarán todos tus trades, cuentas, reglas y datos asociados.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <DangerBtn onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}>
                Sí, eliminar todo
              </DangerBtn>
              <GhostBtn onClick={() => setConfirmDelete(false)}>
                Cancelar
              </GhostBtn>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
