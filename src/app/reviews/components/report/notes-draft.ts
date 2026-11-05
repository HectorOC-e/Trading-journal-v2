// Shared across mounts so a departing editor cannot overwrite its replacement.
const writes = new Map<string, Promise<unknown>>()
export function queueReviewNotes<T>(key: string, save: () => Promise<T>): Promise<T> {
  const next = (writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(save)
  writes.set(key, next)
  void next.finally(() => { if (writes.get(key) === next) writes.delete(key) }).catch(() => undefined)
  return next
}

export function readReviewDraft(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
const revisions = new Map<string, number>()
export function reviewDraftRevision(key: string) { return revisions.get(key) ?? 0 }
export function storeReviewDraft(key: string, notes: string) {
  revisions.set(key, reviewDraftRevision(key) + 1)
  try { localStorage.setItem(key, notes) } catch { /* The mounted editor still retains the draft. */ }
}
export function clearReviewDraft(key: string, saved: string, revision: number) {
  if (revision !== reviewDraftRevision(key)) return
  try { if (localStorage.getItem(key) === saved) localStorage.removeItem(key) } catch { /* Retry recovery remains safe. */ }
}
