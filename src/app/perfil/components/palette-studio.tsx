"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { useTheme } from "@/components/theme-provider"
import {
  PREDEFINED_PALETTES,
  DEFAULT_PALETTE_ID,
  derivePalette,
  applyColorTheme,
  configFromHex,
  tokenToHex,
  contrastRatio,
  makeCustomSelection,
  isCustomSelection,
  customPaletteId,
  type PaletteConfig,
  type CustomPalette,
  type ColorMode,
  type TokenSet,
} from "@/lib/theme"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Swatch preview tile background for a config in a given mode. */
function Swatch({ config, mode, size = 18 }: { config: PaletteConfig; mode: ColorMode; size?: number }) {
  const t = derivePalette(config, mode)
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      <span style={{ width: size, height: size, borderRadius: 5, background: t.bg, border: "1px solid var(--line)" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: t.accent, boxShadow: "0 0 0 2px var(--panel)" }} />
      <span style={{ width: size, height: size, borderRadius: 5, background: t.accentSoft, border: "1px solid var(--line)" }} />
    </span>
  )
}

const ADV_ROLES: { key: keyof TokenSet; label: string }[] = [
  { key: "accent", label: "Acento" },
  { key: "bg",     label: "Fondo" },
  { key: "panel",  label: "Superficie" },
  { key: "ink",    label: "Texto" },
]

const tileBtn = (active: boolean): React.CSSProperties => ({
  display: "flex", flexDirection: "column", gap: 8, padding: 10,
  borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left",
  border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
  background: active ? "var(--accent-soft)" : "var(--panel-2)",
})

// ── Component ─────────────────────────────────────────────────────────────────

export function PaletteStudio() {
  const utils = trpc.useUtils()
  const { resolvedTheme } = useTheme()
  const mode: ColorMode = resolvedTheme === "dark" ? "dark" : "light"

  const { data: prefs } = trpc.preferences.get.useQuery()
  const { data: palettes } = trpc.customPalettes.list.useQuery()
  const lib = (palettes ?? []) as CustomPalette[]

  const [selection, setSelection] = useState<string>(DEFAULT_PALETTE_ID)
  useEffect(() => {
    if (prefs?.colorTheme) setSelection(prefs.colorTheme)
  }, [prefs?.colorTheme])

  const updatePrefs = trpc.preferences.update.useMutation({
    onError: (e) => toast.error(formatErrorForUser(e)),
  })
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function persist(sel: string) {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => updatePrefs.mutate({ colorTheme: sel }), 400)
  }

  function apply(sel: string) {
    setSelection(sel)
    applyColorTheme(sel, lib, mode)
    // Keep the global ThemeProvider — the single source of truth that applies the
    // theme (incl. re-injecting on light/dark flips) — in sync immediately, without
    // waiting for the debounced mutation to round-trip. Otherwise a mode flip right
    // after picking would re-apply the still-stale persisted colorTheme.
    utils.preferences.get.setData(undefined, (old) =>
      old ? { ...old, colorTheme: sel } : old,
    )
    persist(sel)
  }

  // NOTE: applying the theme on mount / mode-change is intentionally NOT done here.
  // The ThemeProvider owns global application (it re-injects custom inline vars when
  // the resolved mode flips, since its effect depends on `theme`). Doing it here too
  // raced the provider and — because the provider's effect doesn't re-run on route
  // changes — clobbered the active palette every time the profile page mounted.

  // ── Creator modal ──
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [config, setConfig] = useState<PaletteConfig>({ hue: 264 })
  const [advanced, setAdvanced] = useState(false)

  function openCreate() {
    setEditingId(null); setName(""); setConfig(configFromHex("#4f46e5")); setAdvanced(false); setOpen(true)
  }
  function openEdit(p: CustomPalette) {
    setEditingId(p.id); setName(p.name); setConfig(p.config); setAdvanced(false); setOpen(true)
  }

  const createMut = trpc.customPalettes.create.useMutation()
  const updateMut = trpc.customPalettes.update.useMutation()
  const deleteMut = trpc.customPalettes.delete.useMutation()

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) { toast.error("Ponle un nombre a tu paleta"); return }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, name: trimmed, config })
        await utils.customPalettes.list.invalidate()
        const sel = makeCustomSelection(editingId)
        const fresh = await utils.customPalettes.list.fetch()
        applyColorTheme(sel, fresh as CustomPalette[], mode)
        apply(sel)
        toast.success("Paleta actualizada")
      } else {
        const created = await createMut.mutateAsync({ name: trimmed, config })
        const fresh = await utils.customPalettes.list.fetch()
        const sel = makeCustomSelection(created.id)
        applyColorTheme(sel, fresh as CustomPalette[], mode)
        apply(sel)
        toast.success("Paleta creada")
      }
      setOpen(false)
    } catch (e) {
      toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))
    }
  }

  async function remove(p: CustomPalette) {
    if (!confirm(`¿Eliminar la paleta "${p.name}"?`)) return
    try {
      await deleteMut.mutateAsync(p.id)
      await utils.customPalettes.list.invalidate()
      if (isCustomSelection(selection) && customPaletteId(selection) === p.id) apply(DEFAULT_PALETTE_ID)
      toast.success("Paleta eliminada")
    } catch (e) {
      toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))
    }
  }

  // ── Render ──
  return (
    <div style={{ marginTop: 20 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 10 }}>
        Paleta de color
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {PREDEFINED_PALETTES.map((p) => {
          const active = selection === p.id
          return (
            <button key={p.id} onClick={() => apply(p.id)} style={tileBtn(active)}>
              <Swatch config={p.config} mode={mode} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? "var(--accent)" : "var(--ink)" }}>{p.label}</span>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.3 }}>{p.blurb}</span>
            </button>
          )
        })}

        {lib.map((p) => {
          const sel = makeCustomSelection(p.id)
          const active = selection === sel
          return (
            <div key={p.id} style={{ ...tileBtn(active), position: "relative" }}>
              <button onClick={() => apply(sel)} style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
                <Swatch config={p.config} mode={mode} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? "var(--accent)" : "var(--ink)" }}>{p.name}</span>
                <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>Personalizada</span>
              </button>
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                <button title="Editar" onClick={() => openEdit(p)} style={iconBtn}><Pencil size={12} /></button>
                <button title="Eliminar" onClick={() => remove(p)} style={iconBtn}><Trash2 size={12} /></button>
              </div>
            </div>
          )
        })}

        <button onClick={openCreate} style={{ ...tileBtn(false), alignItems: "center", justifyContent: "center", minHeight: 96, color: "var(--ink-2)", borderStyle: "dashed" }}>
          <Plus size={20} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Crear paleta</span>
        </button>
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10 }}>
        Win/Loss (verde/rojo) se mantienen reservados para resultados de trading y no cambian con la paleta.
      </p>

      {open && (
        <CreatorModal
          mode={mode}
          name={name} setName={setName}
          config={config} setConfig={setConfig}
          advanced={advanced} setAdvanced={setAdvanced}
          editing={!!editingId}
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 22, height: 22, borderRadius: 6, cursor: "pointer",
  background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)",
}

// ── Creator modal ─────────────────────────────────────────────────────────────

function CreatorModal({
  mode, name, setName, config, setConfig, advanced, setAdvanced, editing, onCancel, onSave, saving,
}: {
  mode: ColorMode
  name: string; setName: (v: string) => void
  config: PaletteConfig; setConfig: (c: PaletteConfig) => void
  advanced: boolean; setAdvanced: (v: boolean) => void
  editing: boolean
  onCancel: () => void; onSave: () => void; saving: boolean
}) {
  const t = derivePalette(config, mode)
  const accentHex = tokenToHex(t.accent)
  const contrastHex = tokenToHex(t.accentContrast)
  const ratio = contrastRatio(accentHex, contrastHex)
  const aa = ratio >= 4.5

  // Seed from a single color → rebuild base config (drops overrides).
  function seed(hex: string) {
    setConfig({ ...configFromHex(hex), chroma: config.chroma })
  }
  function overrideRole(role: keyof TokenSet, hex: string) {
    const ov = { ...(config.overrides ?? {}) }
    ov[mode] = { ...(ov[mode] ?? {}), [role]: hex }
    setConfig({ ...config, overrides: ov })
  }

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{editing ? "Editar paleta" : "Crear paleta"}</p>
          <button onClick={onCancel} style={iconBtn}><X size={14} /></button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Nombre</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Mi paleta"
              style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--ink)", fontSize: 13 }}
            />
          </div>

          {/* Seed color */}
          <div>
            <label style={labelStyle}>Color base</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={accentHex} onChange={(e) => seed(e.target.value)} style={{ width: 40, height: 32, padding: 0, border: "1px solid var(--line)", borderRadius: 8, background: "none", cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Elige un color y generamos la paleta completa.</span>
            </div>
          </div>

          {/* Live preview */}
          <div style={{ borderRadius: "var(--radius)", border: `1px solid ${t.line}`, background: t.bg, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: t.ink3, marginBottom: 10 }}>Vista previa · {mode === "dark" ? "oscuro" : "claro"}</p>
            <div style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: "var(--radius-sm)", padding: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, margin: 0 }}>Dashboard</p>
              <p style={{ fontSize: 11, color: t.ink3, margin: "2px 0 10px" }}>P&amp;L del mes</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button style={{ height: 30, padding: "0 14px", borderRadius: 7, background: t.accent, color: t.accentContrast, fontSize: 12, fontWeight: 600, border: "none" }}>Nuevo trade</button>
                <span style={{ height: 24, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: t.accentSoft, color: t.accent, fontSize: 11, fontWeight: 600 }}>Activo</span>
                <span style={{ color: "var(--win)", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>+$1,240</span>
                <span style={{ color: "var(--loss)", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>−$380</span>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 9px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: aa ? "var(--win-soft)" : "var(--loss-soft)", color: aa ? "var(--win)" : "var(--loss)" }}>
              {aa ? "✓" : "⚠"} Contraste del acento {ratio.toFixed(1)}:1 {aa ? "AA" : "bajo"}
            </div>
          </div>

          {/* Advanced */}
          <div>
            <button onClick={() => setAdvanced(!advanced)} style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
              {advanced ? "▾" : "▸"} Ajustes avanzados (afinar roles · {mode === "dark" ? "oscuro" : "claro"})
            </button>
            {advanced && (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ADV_ROLES.map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-2)" }}>
                    <input type="color" value={tokenToHex(t[key])} onChange={(e) => overrideRole(key, e.target.value)} style={{ width: 30, height: 26, padding: 0, border: "1px solid var(--line)", borderRadius: 6, background: "none", cursor: "pointer" }} />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
          <button onClick={onCancel} style={{ height: 34, padding: "0 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--ink-2)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onSave} disabled={saving} style={{ height: 34, padding: "0 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--accent)", color: "var(--accent-contrast)", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em",
  color: "var(--ink-3)", display: "block", marginBottom: 6,
}
