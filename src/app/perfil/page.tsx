"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/layout/top-bar"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

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

  /* ── Local form state — initialized from server data ── */
  const [name,               setName]               = useState("")
  const [timezone,           setTimezone]           = useState("")
  const [language,           setLanguage]           = useState<"es" | "en">("es")
  const [baseCurrency,       setBaseCurrency]       = useState("")
  const [weeklyGoalMinutes,  setWeeklyGoalMinutes]  = useState(300)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [formInitialized,    setFormInitialized]    = useState(false)

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

  /* ── Password modal state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword,      setNewPassword]      = useState("")

  /* ── Delete confirmation ── */
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const exportMut = trpc.profile.exportData.useQuery(undefined, {
    enabled: false,
  })

  const deleteMut = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Cuenta eliminada. Serás redirigido.")
      setTimeout(() => { window.location.href = "/login" }, 2000)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

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
    const result = await exportMut.refetch()
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `trading-journal-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Datos exportados correctamente")
    } else {
      toast.error("Error al exportar datos")
    }
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
            <GhostBtn onClick={handleExport} loading={exportMut.isFetching}>
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
