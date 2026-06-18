"use client"

// Epic 2 — Tag catalog management: grouped by category, with appearance editors
// (color/icon/displayMode/description), usage counts, system protection, reorder.

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Lock, Pencil, Merge, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react"
import { DynamicIcon, type IconName } from "lucide-react/dynamic"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { TagChipView } from "@/components/tags/tag-chip"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { TagMeta } from "@/lib/tags"

type TagRow = TagMeta & { id: string; count: number }

const COLOR_PRESETS = ["#6b7280", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"]
const ICON_PRESETS = ["tag", "star", "zap", "alert-triangle", "swords", "target", "flame", "brain", "trending-up", "trending-down", "shield", "clock", "check", "x", "flag", "bookmark"]
const CATEGORY_SUGGESTIONS = ["Psicología", "Calidad", "Ejecución", "Setup", "Contexto"]
const DISPLAY_MODES: { value: string; label: string }[] = [
  { value: "icon_color", label: "Icono+color" }, { value: "dot", label: "Punto" }, { value: "text", label: "Texto" },
]

const blankDraft = (): Partial<TagRow> => ({ name: "", color: "#6b7280", icon: "tag", category: "", displayMode: "icon_color", description: "" })

export default function EtiquetasPage() {
  const utils = trpc.useUtils()
  const seededRef = useRef(false)
  const { data, isLoading } = trpc.tags.list.useQuery(undefined, { staleTime: 30_000 })
  const ensureSeeded = trpc.tags.ensureSeeded.useMutation()

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    ensureSeeded.mutate(undefined, { onSuccess: (r) => { if (r.seeded) void utils.tags.list.invalidate() } })
  }, [ensureSeeded, utils])

  const tags = useMemo<TagRow[]>(() => (data ?? []) as TagRow[], [data])
  const [search, setSearch] = useState("")

  const invalidate = () => utils.tags.list.invalidate()
  const mk = (label: string) => ({
    onSuccess: () => { toast.success(label); invalidate() },
    onError:   (e: unknown) => toast.error(formatErrorForUser(e as never)),
  })
  const createMut  = trpc.tags.create.useMutation(mk("Etiqueta creada"))
  const updateMut  = trpc.tags.update.useMutation(mk("Etiqueta actualizada"))
  const renameMut  = trpc.tags.rename.useMutation(mk("Etiqueta renombrada"))
  const deleteMut  = trpc.tags.delete.useMutation(mk("Etiqueta eliminada"))
  const mergeMut   = trpc.tags.merge.useMutation(mk("Etiquetas fusionadas"))
  const reorderMut = trpc.tags.reorder.useMutation({ onSuccess: invalidate })

  const [editor, setEditor] = useState<{ mode: "create" | "edit"; draft: Partial<TagRow> } | null>(null)
  const [nameError, setNameError] = useState("")
  const [merging, setMerging] = useState<TagRow | null>(null)
  const [mergeSurvivor, setMergeSurvivor] = useState("")
  const [deleting, setDeleting] = useState<TagRow | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags
  }, [tags, search])

  const groups = useMemo(() => {
    const map = new Map<string, TagRow[]>()
    for (const t of filtered) {
      const key = t.category || "Sin categoría"
      const arr = map.get(key) ?? []; arr.push(t); map.set(key, arr)
    }
    return [...map.entries()].sort(([a], [b]) => (a === "Sin categoría" ? 1 : b === "Sin categoría" ? -1 : a.localeCompare(b)))
  }, [filtered])

  function move(list: TagRow[], idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    const ids = list.map((t) => t.id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    reorderMut.mutate({ ids })
  }

  function saveEditor() {
    if (!editor) return
    const d = editor.draft
    if (!d.name?.trim()) { setNameError("Ponle un nombre a la etiqueta"); return }
    const mode = d.displayMode as "icon_color" | "dot" | "text" | undefined
    if (editor.mode === "create") {
      createMut.mutate({ name: d.name.trim(), color: d.color, icon: d.icon ?? null, category: d.category, displayMode: mode, description: d.description })
    } else if (d.id) {
      const orig = tags.find((t) => t.id === d.id)
      if (orig && !orig.isSystem && d.name.trim() !== orig.name) {
        renameMut.mutate({ oldName: orig.name, newName: d.name.trim() })
      }
      updateMut.mutate({ id: d.id, color: d.color, icon: d.icon ?? null, category: d.category, displayMode: mode, description: d.description })
    }
    setEditor(null)
  }

  return (
    <main aria-label="Etiquetas">
      <TopBar
        title="Etiquetas"
        subtitle={`${tags.length} etiquetas`}
        actions={[{ label: "Nueva etiqueta", icon: <Plus size={14} />, variant: "primary" as const, onClick: () => { setNameError(""); setEditor({ mode: "create", draft: blankDraft() }) } }]}
      />

      <div className="mb-4 flex max-w-[820px] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3">
        <Search size={14} className="text-[var(--ink-3)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar etiqueta…" className="h-9 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]" />
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-[13px] text-[var(--ink-3)]">Cargando…</p>
      ) : tags.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-[var(--ink-3)]">Aún no tienes etiquetas. Crea una o registra trades con tags.</p>
      ) : (
        <div className="flex max-w-[820px] flex-col gap-6">
          {groups.map(([category, rows]) => (
            <section key={category}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{category}</p>
              <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
                {rows.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
                    <div className="flex flex-col">
                      <button onClick={() => move(rows, i, -1)} disabled={i === 0} aria-label="Subir" className="text-[var(--ink-3)] hover:text-[var(--ink)] disabled:opacity-30"><ChevronUp size={12} /></button>
                      <button onClick={() => move(rows, i, 1)} disabled={i === rows.length - 1} aria-label="Bajar" className="text-[var(--ink-3)] hover:text-[var(--ink)] disabled:opacity-30"><ChevronDown size={12} /></button>
                    </div>
                    <div className="min-w-[140px]"><TagChipView meta={t} /></div>
                    {t.isSystem && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--chip)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--ink-3)]"><Lock size={9} /> Sistema</span>}
                    <span className="ml-auto text-[11px] text-[var(--ink-3)]">{t.count} uso{t.count !== 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setNameError(""); setEditor({ mode: "edit", draft: { ...t } }) }} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"><Pencil size={13} /></button>
                      {!t.isSystem && <button onClick={() => { setMerging(t); setMergeSurvivor("") }} aria-label="Fusionar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"><Merge size={13} /></button>}
                      {!t.isSystem && <button onClick={() => setDeleting(t)} aria-label="Eliminar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--loss-soft)] hover:text-[var(--loss)]"><Trash2 size={13} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog open={!!editor} onOpenChange={(v) => { if (!v) { setEditor(null); setNameError("") } }}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader><DialogTitle>{editor?.mode === "create" ? "Nueva etiqueta" : "Editar etiqueta"}</DialogTitle></DialogHeader>
          {editor && (() => {
            const orig = editor.draft.id ? tags.find((t) => t.id === editor.draft.id) : undefined
            const nameLocked = !!orig?.isSystem
            const set = (patch: Partial<TagRow>) => setEditor({ ...editor, draft: { ...editor.draft, ...patch } })
            return (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="input-label">Nombre {nameLocked && <span className="text-[var(--ink-3)]">(sistema · bloqueado)</span>}</label>
                  <input value={editor.draft.name ?? ""} disabled={nameLocked} aria-invalid={!!nameError || undefined} onChange={(e) => { set({ name: e.target.value }); if (nameError) setNameError("") }} className={`h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] outline-none disabled:opacity-60 ${nameError ? "border-[var(--loss)]" : "border-[var(--line)]"}`} />
                  <FieldError message={nameError} />
                </div>
                <div>
                  <label className="input-label">Color</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} onClick={() => set({ color: c })} aria-label={c} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: editor.draft.color === c ? "var(--ink)" : "transparent" }} />
                    ))}
                    <input type="color" value={editor.draft.color ?? "#6b7280"} onChange={(e) => set({ color: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-[var(--line)] bg-transparent" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Icono</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_PRESETS.map((ic) => (
                      <button key={ic} onClick={() => set({ icon: ic })} aria-label={ic} className="flex h-7 w-7 items-center justify-center rounded-[6px] border" style={{ borderColor: editor.draft.icon === ic ? "var(--accent)" : "var(--line)", color: "var(--ink-2)" }}>
                        <DynamicIcon name={ic as IconName} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label">Categoría</label>
                  <input list="tag-categories" value={editor.draft.category ?? ""} onChange={(e) => set({ category: e.target.value })} placeholder="Sin categoría" className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] outline-none" />
                  <datalist id="tag-categories">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="input-label">Visualización</label>
                  <div className="flex gap-1.5">
                    {DISPLAY_MODES.map((m) => (
                      <button key={m.value} onClick={() => set({ displayMode: m.value })} className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-[12px] ${editor.draft.displayMode === m.value ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--ink-3)]"}`}>{m.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label">Descripción</label>
                  <input value={editor.draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] outline-none" />
                </div>
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] px-3 py-2">
                  <span className="text-[11px] text-[var(--ink-3)]">Vista previa:</span>
                  <TagChipView meta={{ name: editor.draft.name || "etiqueta", color: editor.draft.color ?? "#6b7280", icon: editor.draft.icon ?? null, description: "", category: "", displayMode: editor.draft.displayMode ?? "icon_color", sortOrder: 0, isSystem: false, semantic: null }} />
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveEditor}>{editor?.mode === "create" ? "Crear" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge modal */}
      <Dialog open={!!merging} onOpenChange={(v) => { if (!v) setMerging(null) }}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader><DialogTitle>Fusionar «{merging?.name}»</DialogTitle></DialogHeader>
          <p className="mb-3 text-[12px] text-[var(--ink-3)]">Todos los trades con «{merging?.name}» pasarán a la etiqueta superviviente, y «{merging?.name}» se elimina.</p>
          <select value={mergeSurvivor} onChange={(e) => setMergeSurvivor(e.target.value)} className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)]">
            <option value="">Elige etiqueta superviviente…</option>
            {tags.filter((t) => t.id !== merging?.id).map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMerging(null)}>Cancelar</Button>
            <Button variant="primary" disabled={!mergeSurvivor} onClick={() => { if (merging && mergeSurvivor) mergeMut.mutate({ dying: merging.name, survivor: mergeSurvivor }); setMerging(null) }}>Fusionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader><DialogTitle>Eliminar «{deleting?.name}»</DialogTitle></DialogHeader>
          <p className="mb-2 text-[12px] text-[var(--ink-3)]">Se quitará de todos los trades ({deleting?.count} uso{deleting?.count !== 1 ? "s" : ""}) y se borrará su configuración. No se puede deshacer.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { if (deleting) deleteMut.mutate(deleting.id); setDeleting(null) }}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
