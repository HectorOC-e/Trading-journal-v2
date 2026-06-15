"use client"

// TASK-051: Custom Tags Management — create, rename, delete, merge

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2, Merge, Check, X } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DataTable, DataTableToolbar, DataTablePagination, useDataTable } from "@/components/ui/data-table"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

type TagRow = { tag: string; count: number }

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

      <TagsTable
        tags={tags}
        isLoading={isLoading}
        renaming={renaming}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onStartRename={startRename}
        onCommitRename={commitRename}
        onCancelRename={() => setRenaming(null)}
        renamePending={renameMutation.isPending}
        onMerge={(tag) => { setMerging({ dying: tag }); setMergeSurvivor("") }}
        onDelete={setDeletingTag}
      />

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

// ── Tags table (DataTable: search + sort by usage + usage bar) ────────────────
function TagsTable({
  tags, isLoading,
  renaming, renameValue, setRenameValue,
  onStartRename, onCommitRename, onCancelRename, renamePending,
  onMerge, onDelete,
}: {
  tags: TagRow[]
  isLoading: boolean
  renaming: string | null
  renameValue: string
  setRenameValue: (v: string) => void
  onStartRename: (tag: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
  renamePending: boolean
  onMerge: (tag: string) => void
  onDelete: (tag: string) => void
}) {
  const maxCount = useMemo(() => Math.max(1, ...tags.map(t => t.count)), [tags])

  const columns = useMemo<ColumnDef<TagRow>[]>(() => [
    {
      id: "tag",
      accessorKey: "tag",
      meta: { width: "minmax(160px, 2fr)", headerLabel: "Etiqueta" },
      header: () => <span>Etiqueta</span>,
      cell: ({ row }) => {
        const tag = row.original.tag
        if (renaming === tag) {
          return (
            <div className="flex items-center gap-1.5 w-full min-w-0" onClick={e => e.stopPropagation()}>
              <input
                autoFocus value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCancelRename() }}
                maxLength={30}
                className="h-7 flex-1 min-w-0 px-2 rounded border border-[var(--accent)] bg-[var(--panel-2)] text-[12px] text-[var(--ink)] focus:outline-none"
              />
              <button type="button" onClick={onCommitRename} disabled={renamePending} className="shrink-0 p-1 rounded text-[var(--win)] hover:bg-[var(--win-soft)] transition-colors active:scale-90"><Check size={14} /></button>
              <button type="button" onClick={onCancelRename} className="shrink-0 p-1 rounded text-[var(--ink-3)] hover:bg-[var(--panel-2)] transition-colors active:scale-90"><X size={14} /></button>
            </div>
          )
        }
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>{tag}</span>
      },
    },
    {
      id: "count",
      accessorKey: "count",
      meta: { width: "minmax(120px, 1fr)", headerLabel: "Usos", align: "right" },
      header: () => <span>Usos</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2 w-full">
          <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(row.original.count / maxCount) * 100}%` }} />
          </div>
          <span className="font-mono text-[12px] font-semibold text-[var(--ink-2)] tabular-nums w-7 text-right">{row.original.count}</span>
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      meta: { width: "120px", align: "right" },
      header: () => null,
      cell: ({ row }) => {
        const tag = row.original.tag
        return (
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => onStartRename(tag)} title="Renombrar" className="p-1.5 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] transition-colors active:scale-90"><Pencil size={13} /></button>
            <button onClick={() => onMerge(tag)} title="Fusionar" className="p-1.5 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] transition-colors active:scale-90"><Merge size={13} /></button>
            <button onClick={() => onDelete(tag)} title="Eliminar" className="p-1.5 rounded text-[var(--ink-3)] hover:text-[var(--loss)] hover:bg-[var(--loss-soft)] transition-colors active:scale-90"><Trash2 size={13} /></button>
          </div>
        )
      },
    },
  ], [renaming, renameValue, renamePending, maxCount, setRenameValue, onCommitRename, onCancelRename, onStartRename, onMerge, onDelete])

  const { table, density, setDensity } = useDataTable<TagRow>({
    data: tags, columns, storageKey: "tj-tags-table", pageSize: 50,
    getRowId: (t) => t.tag,
    initialSorting: [{ id: "count", desc: true }],
  })

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar
        table={table} density={density} onDensityChange={setDensity}
        searchPlaceholder="Buscar etiqueta…" exportFilename="etiquetas.csv"
        enableColumnToggle={false}
      />
      <DataTable
        table={table} density={density} isLoading={isLoading}
        empty={<div className="flex flex-col items-center gap-1"><p className="text-[13px] font-medium text-[var(--ink-2)]">Sin etiquetas</p><p className="text-[12px] text-[var(--ink-3)]">Añade tags al registrar trades.</p></div>}
      />
      <DataTablePagination table={table} />
    </div>
  )
}
