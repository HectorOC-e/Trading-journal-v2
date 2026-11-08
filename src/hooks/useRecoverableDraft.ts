"use client"
import { useEffect, useLayoutEffect, useCallback, useRef, useState } from 'react'
export const DRAFT_PREFIX = 'tj-draft:v1:'
type Recovery<T> = { value: T; updatedAt: number }
/** Local recovery is offered only; callers explicitly restore editable fields. */
export function useRecoverableDraft<T>(user: string | undefined, scope: string, parse: (v: unknown) => T | null) {
 const key = user ? `${DRAFT_PREFIX}${user}:${scope}` : null
 const [candidate, setCandidate] = useState<{key: string; draft: Recovery<T>; token: string} | null>(null)
 const [loadedKey, setLoadedKey] = useState<string | null>(null)
 const active = useRef(key)
 const owned = useRef<{ key: string | null; token: string | null }>({ key, token: null })
 const parser = useRef(parse)
 useLayoutEffect(() => {
  active.current = key; parser.current = parse
  if (owned.current.key !== key) owned.current = { key, token: null }
 })
 useEffect(() => {
  setCandidate(null)
  setLoadedKey(key)
  if (!key) return
  try {
   const raw = localStorage.getItem(key)
   if (!raw) return
   const d = JSON.parse(raw)
   const value = d.version === 1 ? parser.current(d.value) : null
   if (value !== null && typeof d.updatedAt === 'number') setCandidate({ key, token: raw, draft: { value, updatedAt: d.updatedAt } })
  } catch { /* Malformed/unavailable storage must not block editing. */ }
 }, [key])
 const snapshot = () => !key || active.current !== key || owned.current.key !== key ? null : owned.current.token
 const store = useCallback((value: T) => {
  if (!key || active.current !== key) return
  try {
   const token = JSON.stringify({ version: 1, updatedAt: Date.now(), revision: crypto.randomUUID(), value })
   localStorage.setItem(key, token)
   owned.current = { key, token }
  } catch { /* Mounted form remains usable. */ }
 }, [key])
 const clearSaved = (token: string | null) => {
  if (!key || active.current !== key || token === null) return
  try { if (localStorage.getItem(key) === token) localStorage.removeItem(key) } catch { /* Preserve recovery on failure. */ }
 }
 const discard = () => {
  clearSaved(candidate?.key === key ? candidate.token : snapshot())
  setCandidate(null)
 }
 // Existing editors call dismiss only after explicitly restoring the candidate.
 const dismiss = () => {
  if (key && active.current === key && candidate?.key === key) owned.current = { key, token: candidate.token }
  setCandidate(null)
 }
 return { ready: !!key && loadedKey === key, recovery: candidate?.key === key ? candidate.draft : null, store, snapshot, clearSaved, discard, dismiss }
}
