"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-[var(--radius)] border bg-[var(--panel)] p-5 flex flex-col gap-4 ${danger ? "border-[var(--loss)]" : "border-[var(--line)]"}`}>
      <p className="text-eyebrow">{title}</p>
      {children}
    </div>
  )
}

const STATS = [
  { label: "Total trades",        value: "156" },
  { label: "Cuentas activas",     value: "1" },
  { label: "Setups en playbook",  value: "8" },
  { label: "Semanas trackeadas",  value: "20" },
  { label: "Mejor semana",        value: "+$3,640", win: true },
  { label: "Racha ganadora",      value: "7 trades" },
]

export default function PerfilPage() {
  const [name, setName]     = useState("Héctor O.C.")
  const [role, setRole]     = useState("Single-trader")
  const [email, setEmail]   = useState("osoriohector89@gmail.com")
  const [theme, setTheme]   = useState<"dark" | "light">("dark")

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <TopBar title="Perfil" subtitle="Héctor O.C. · Single-trader · TJ" />

      <div className="grid grid-cols-3 gap-4">
        {/* Left col (2/3) */}
        <div className="col-span-2 flex flex-col gap-4">
          <Section title="Información personal">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-lg font-bold shrink-0">
                HO
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">{name}</p>
                <p className="text-xs text-[var(--ink-3)]">{role}</p>
              </div>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Nombre</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Rol</label>
              <Input value={role} onChange={e => setRole(e.target.value)} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button variant="primary" size="sm" className="self-start">Guardar cambios</Button>
          </Section>

          <Section title="Preferencias">
            <div>
              <label className="text-eyebrow block mb-1.5">Timezone</label>
              <select className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
                <option>America/New_York (ET)</option>
                <option>America/Chicago (CT)</option>
                <option>Europe/London (GMT)</option>
              </select>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Divisa base</label>
              <div className="flex gap-2">
                {["USD","EUR","MXN"].map(c => (
                  <button key={c} className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--chip)] text-[var(--ink-2)] first:bg-[var(--accent)] first:text-white">
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Tema</label>
              <div className="flex gap-2">
                {(["dark","light"] as const).map(t => (
                  <button key={t} onClick={() => setTheme(t)}
                    className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors capitalize ${theme === t ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)]"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" size="sm" className="self-start">Guardar preferencias</Button>
          </Section>
        </div>

        {/* Right col (1/3) */}
        <div className="flex flex-col gap-4">
          <Section title="Estadísticas globales">
            <div className="flex flex-col gap-2">
              {STATS.map(s => (
                <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-[var(--line)] last:border-0">
                  <span className="text-xs text-[var(--ink-2)]">{s.label}</span>
                  <span className={`font-mono text-sm font-semibold ${s.win ? "text-[var(--win)]" : "text-[var(--ink)]"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Zona de peligro" danger>
            <p className="text-xs text-[var(--ink-3)]">Estas acciones son irreversibles. Procede con cuidado.</p>
            <Button variant="ghost" size="sm">Exportar todos los datos</Button>
            <Button size="sm" className="bg-[var(--loss-soft)] text-[var(--loss)] border border-[var(--loss)] hover:opacity-90">
              Eliminar cuenta
            </Button>
          </Section>
        </div>
      </div>
    </div>
  )
}
