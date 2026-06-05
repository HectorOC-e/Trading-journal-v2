"use client"

// TASK-051: Custom Tags Management — create, rename, delete, merge

import { useState } from "react"
import { Pencil, Trash2, Merge, Check, X } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

export default function EtiquetasPage() {
  const utils = trpc.useUtils()
  const { data: tags = [], isLoading } = trpc.tradeTags.list.useQuery()

  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [merging, setMerging] = useState<{ dying: string } | null>(null)
  const [mergeSurvivor, setMergeSurvivor] = useState<string>("")

  const invalidate = () => utils.tradeTags.list.invalidate()

  const renameMutation = trpc.tradeTags.rename.useMutation({
    onSuccess: () => { toast.success("Tag renombrado"); setRenaming(null); invalidate() },
    onError:   (e) => toast.error(formatErrorForUser(e)),
  })
  const deleteMutation = trpc.tradeTags.delete.useMutation({
    onSuccess: () => { toast.success("Tag eliminado"); setDeletingTag(null); invalidate() },
    onError:   (e) => toast.error(formatErrorForUser(e)),
  })
  const mergeMutation = trpc.tradeTags.merge.useMutation({
    onSuccess: () => { toast.success("Tags fusionados"); setMerging(null); setMergeSurvivor(""); invalidate() },
    onError:   (e) => toast.error(formatErrorForUser(e)),
  })

  function startRename(tag: string) {
    setRenaming(tag)
    setRenameValue(tag)
  }

  function commitRename() {
    if (!renaming || !renameValue.trim()) return
    renameMutation.mutate({ oldTag: renaming, newTag: renameValue.trim() })
  }

  return (
    <div>
      <TopBar
        title="Etiquetas"
        subtitle="Gestiona los tags usados en tus trades"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[var(--ink-3)] text-sm">
          Cargando…
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[var(--ink-3)] text-sm">No has usado etiquetas todavía.</p>
          <p className="text-[var(--ink-3)] text-xs">Añade tags al registrar trades.</p>
        </div>
      ) : (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "var(--panel-2)", borderBottom: "1px solid var(--line)" }}>
                <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Etiqueta</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--ink)] w-24">Usos</th>
                <th className="px-4 py-3 text-right w-28" />
              </tr>
            </thead>
            <tbody>
              {tags.map(({ tag, count }, idx) => (
                <tr
                  key={tag}
                  style={{ borderTop: idx > 0 ? "1px solid var(--line)" : undefined }}
                >
                  <td className="px-4 py-3">
                    {renaming === tag ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null) }}
                          maxLength={30}
                          className="h-7 px-2 rounded border border-[var(--accent)] bg-[var(--panel-2)] text-[12px] text-[var(--ink)] focus:outline-none"
                          style={{ width: 160 }}
                        />
                        <button onClick={commitRename} disabled={renameMutation.isPending} className="text-[var(--win)]">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setRenaming(null)} className="text-[var(--ink-3)]">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: "var(--chip)", color: "var(--ink-2)" }}
                      >
                        {tag}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--ink-3)]">{count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startRename(tag)}
                        title="Renombrar"
                        className="p-1.5 rounded hover:bg-[var(--panel-2)] transition-colors"
                        style={{ color: "var(--ink-3)" }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { setMerging({ dying: tag }); setMergeSurvivor("") }}
                        title="Fusionar con otro tag"
                        className="p-1.5 rounded hover:bg-[var(--panel-2)] transition-colors"
                        style={{ color: "var(--ink-3)" }}
                      >
                        <Merge size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingTag(tag)}
                        title="Eliminar"
                        className="p-1.5 rounded hover:bg-[var(--loss-soft)] transition-colors"
                        style={{ color: "var(--ink-3)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deletingTag !== null} onOpenChange={() => setDeletingTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar etiqueta</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            ¿Eliminar <strong>{deletingTag}</strong> de todos los trades? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTag(null)}>Cancelar</Button>
            <button
              onClick={() => deletingTag && deleteMutation.mutate(deletingTag)}
              disabled={deleteMutation.isPending}
              style={{
                height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)",
                background: "var(--loss)", color: "white",
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                opacity: deleteMutation.isPending ? 0.7 : 1,
              }}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={merging !== null} onOpenChange={() => setMerging(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fusionar etiqueta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Todos los trades con <strong>{merging?.dying}</strong> recibirán el tag seleccionado.
            </p>
            <select
              value={mergeSurvivor}
              onChange={e => setMergeSurvivor(e.target.value)}
              className="h-9 px-2 rounded border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] focus:outline-none"
            >
              <option value="">Selecciona el tag destino…</option>
              {tags.filter(t => t.tag !== merging?.dying).map(t => (
                <option key={t.tag} value={t.tag}>{t.tag} ({t.count} usos)</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMerging(null)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!mergeSurvivor || mergeMutation.isPending}
              onClick={() => merging && mergeSurvivor && mergeMutation.mutate({ dyingTag: merging.dying, survivingTag: mergeSurvivor })}
            >
              {mergeMutation.isPending ? "Fusionando…" : "Fusionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
