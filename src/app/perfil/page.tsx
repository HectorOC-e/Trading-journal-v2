"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"

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

function TextInput({ value, onChange, placeholder }: { value: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
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

function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
      background: "var(--accent)", color: "white",
      fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
    }}>
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
      background: "var(--chip)", color: "var(--ink-2)",
      fontSize: 13, fontWeight: 500, border: "1px solid var(--line)", cursor: "pointer",
    }}>
      {children}
    </button>
  )
}

function DangerBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
      background: "var(--loss-soft)", color: "var(--loss)",
      fontSize: 13, fontWeight: 600, border: "1px solid var(--loss)", cursor: "pointer",
    }}>
      {children}
    </button>
  )
}

const SESSIONS = [
  { key: "ASIA",    start: "18:00", end: "02:00" },
  { key: "LONDON",  start: "02:00", end: "05:00" },
  { key: "NY AM",   start: "07:30", end: "10:30" },
  { key: "NY PM",   start: "13:00", end: "16:00" },
]

export default function PerfilPage() {
  const [nombre,    setNombre]    = useState("Héctor")
  const [apellido,  setApellido]  = useState("O.C.")
  const [email,     setEmail]     = useState("hector@trading-journal.app")
  const [timezone,  setTimezone]  = useState("America/Tegucigalpa (UTC-6)")
  const [idioma,    setIdioma]    = useState("Español")

  const [riesgo,    setRiesgo]    = useState("1%")
  const [maxTrades, setMaxTrades] = useState("3")
  const [dailyCap,  setDailyCap]  = useState("3%")

  const [autoPause,  setAutoPause]  = useState(true)
  const [reminder,   setReminder]   = useState(true)
  const [blockNFP,   setBlockNFP]   = useState(false)

  const [notifReview,   setNotifReview]   = useState(true)
  const [notifViol,     setNotifViol]     = useState(true)
  const [notifCustom,   setNotifCustom]   = useState(false)

  return (
    <div className="main-content">
      <TopBar title="Perfil" subtitle="Preferencias del trader · UTC-6 América/Tegucigalpa" />

      <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header: Avatar + Stats ── */}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Avatar row */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
              }} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>Héctor O.C.</p>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>hector@trading-journal.app</p>
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    { label: "Miembro desde", value: "12 dic 2025" },
                    { label: "Trades registrados", value: "1,247" },
                    { label: "Reviews enviadas", value: "22" },
                  ].map(s => (
                    <div key={s.label}>
                      <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button style={{
                alignSelf: "flex-start", height: 34, padding: "0 14px",
                borderRadius: "var(--radius-sm)", background: "var(--chip)",
                border: "1px solid var(--line)", color: "var(--ink-2)",
                fontSize: 12.5, fontWeight: 500, cursor: "pointer",
              }}>
                Cambiar avatar
              </button>
            </div>
          </div>
        </Card>

        {/* ── Datos personales ── */}
        <Card>
          <SectionTitle>Datos personales</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Nombre">
              <TextInput value={nombre} onChange={setNombre} />
            </Field>
            <Field label="Apellido">
              <TextInput value={apellido} onChange={setApellido} />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Email">
              <TextInput value={email} onChange={setEmail} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
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
                <option>America/Tegucigalpa (UTC-6)</option>
                <option>America/New_York (ET)</option>
                <option>America/Chicago (CT)</option>
                <option>Europe/London (GMT)</option>
              </select>
            </Field>
            <Field label="Idioma">
              <select
                value={idioma}
                onChange={e => setIdioma(e.target.value)}
                style={{
                  height: 38, padding: "0 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--panel-2)",
                  color: "var(--ink)", fontSize: 13,
                  outline: "none", width: "100%",
                }}
              >
                <option>Español</option>
                <option>English</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 20 }}>
            <PrimaryBtn>Guardar cambios</PrimaryBtn>
          </div>
        </Card>

        {/* ── Sesiones de trading ── */}
        <Card>
          <SectionTitle>Sesiones de trading</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 16 }}>
            Defaults usados por SessionClassificationService para clasificar cada trade.
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

        {/* ── Risk & Disciplina ── */}
        <Card>
          <SectionTitle>Risk &amp; Disciplina</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 16 }}>
            Estos defaults aplican al crear una cuenta nueva.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 8 }}>
            {[
              { label: "Riesgo por trade", value: riesgo, set: setRiesgo },
              { label: "Max trades / día", value: maxTrades, set: setMaxTrades },
              { label: "Daily loss cap",   value: dailyCap, set: setDailyCap },
            ].map(f => (
              <Field key={f.label} label={f.label}>
                <TextInput value={f.value} onChange={f.set} />
              </Field>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <ToggleRow label="Auto-Pausar tras Do-Not-Take" sub="Cuando el risk engine detecte 3 condiciones, pausar la cuenta inmediatamente." on={autoPause} onChange={setAutoPause} />
            <ToggleRow label="Recordatorio diario de plan" sub="Cada mañana mostrar checklist del primer trade del día." on={reminder} onChange={setReminder} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 14 }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Bloquear NFP</p>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Pausar la cuenta automáticamente el primer jueves del mes.</p>
              </div>
              <Toggle on={blockNFP} onChange={setBlockNFP} />
            </div>
          </div>
        </Card>

        {/* ── Notificaciones ── */}
        <Card>
          <SectionTitle>Notificaciones</SectionTitle>
          <ToggleRow label="Email · review semanal"       sub="Recordatorio cada domingo 7pm para cerrar la semana." on={notifReview}  onChange={setNotifReview} />
          <ToggleRow label="Email · violación detectada"  sub="Cuando el risk engine registre una violación SYSTEM."  on={notifViol}   onChange={setNotifViol} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 14 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Email · regla CUSTOM disparada</p>
              <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Cuando manualmente marques una regla en un trade.</p>
            </div>
            <Toggle on={notifCustom} onChange={setNotifCustom} />
          </div>
        </Card>

        {/* ── Sesión y datos ── */}
        <Card>
          <SectionTitle>Sesión y datos</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <GhostBtn>Cambiar contraseña</GhostBtn>
            <GhostBtn>Exportar datos (CSV/JSON)</GhostBtn>
            <GhostBtn>Cerrar sesión</GhostBtn>
            <DangerBtn>Borrar cuenta</DangerBtn>
          </div>
        </Card>

      </div>
    </div>
  )
}
