// NoteTagSuggestions — suggestion-only auto-tagging chips (#37).
//
// Scans the note with the deterministic suggester and offers the matched tags the
// trader hasn't already applied. One tap confirms (onAdd). Nothing is applied
// automatically — the trader stays in control.

import { suggestTagsFromNote } from "@/domains/trading/services/note-tag-suggester"

export function NoteTagSuggestions({
  note,
  applied,
  onAdd,
}: {
  note: string
  applied: string[]
  onAdd: (tag: string) => void
}) {
  const suggestions = suggestTagsFromNote(note).filter((t) => !applied.includes(t))
  if (suggestions.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-[var(--ink-3)]">Sugeridas:</span>
      {suggestions.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onAdd(tag)}
          className="rounded-full border border-dashed border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <span aria-hidden="true">+ </span>
          <span>{tag}</span>
        </button>
      ))}
    </div>
  )
}
