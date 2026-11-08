// @vitest-environment jsdom
import { renderHook, act, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useRecoverableDraft } from '@/hooks/useRecoverableDraft'
beforeEach(() => localStorage.clear()); afterEach(cleanup)
const parse = (v: unknown) => typeof v === 'string' ? v : null
it('offers recovery and clears only the saved revision', () => {
 const first = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 act(() => first.result.current.store('old'))
 const token = first.result.current.snapshot()
 act(() => first.result.current.store('new'))
 act(() => first.result.current.clearSaved(token)); first.unmount()
 const next = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 expect(next.result.current.recovery?.value).toBe('new')
 act(() => next.result.current.discard()); expect(next.result.current.recovery).toBeNull()
})
it('isolates users and unresolved identity', () => {
 const a = renderHook(() => useRecoverableDraft('a', 'notes', parse))
 act(() => a.result.current.store('private'))
 expect(renderHook(() => useRecoverableDraft('b', 'notes', parse)).result.current.recovery).toBeNull()
 const unknown = renderHook(() => useRecoverableDraft(undefined, 'notes', parse))
 act(() => unknown.result.current.store('bad')); expect(localStorage.length).toBe(1)
})
it('ignores corrupt data and retains editor usability when storage is denied', () => {
 localStorage.setItem('tj-draft:v1:u:notes', '{broken')
 const draft = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 expect(draft.result.current.recovery).toBeNull()
 const original = Storage.prototype.setItem
 Storage.prototype.setItem = () => { throw Error('quota') }
 try { expect(() => draft.result.current.store('safe')).not.toThrow() } finally { Storage.prototype.setItem = original }
})
it('does not clear a replacement draft from an old user closure', () => {
 const h = renderHook(({ user }) => useRecoverableDraft(user, 'notes', parse), { initialProps: { user: 'a' } })
 act(() => h.result.current.store('a'))
 const old = h.result.current
 h.rerender({ user: 'b' })
 act(() => old.store('wrong'))
 expect(localStorage.getItem('tj-draft:v1:b:notes')).toBeNull()
})
it('clears private drafts on logout while retaining view preferences', async () => {
 const { clearSessionStorageKeys } = await import('@/lib/storage-keys')
 localStorage.setItem('tj-draft:v1:a:practice:new:all', 'private')
 localStorage.setItem('review-notes:a:week:2026-11-02', 'private')
 localStorage.setItem('theme', 'dark')
 clearSessionStorageKeys()
 expect(localStorage.getItem('tj-draft:v1:a:practice:new:all')).toBeNull()
 expect(localStorage.getItem('review-notes:a:week:2026-11-02')).toBeNull()
 expect(localStorage.getItem('theme')).toBe('dark')
})
it('saving an older form cannot clear another tab’s newer draft written before save starts', () => {
 const a = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 const b = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 act(() => a.result.current.store('A older form'))
 act(() => b.result.current.store('B newer text'))
 act(() => a.result.current.clearSaved(a.result.current.snapshot()))
 const reload = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 expect(reload.result.current.recovery?.value).toBe('B newer text')
})
it('discard removes only the advertised candidate, preserving a newer unseen revision', () => {
 const writer = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 act(() => writer.result.current.store('advertised'))
 const recovery = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 expect(recovery.result.current.recovery?.value).toBe('advertised')
 act(() => writer.result.current.store('newer unseen'))
 act(() => recovery.result.current.discard())
 expect(renderHook(() => useRecoverableDraft('u', 'notes', parse)).result.current.recovery?.value).toBe('newer unseen')
})
it('hydration does not claim an unrestored draft as this form’s save token', () => {
 const writer = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 act(() => writer.result.current.store('recoverable'))
 const form = renderHook(() => useRecoverableDraft('u', 'notes', parse))
 expect(form.result.current.snapshot()).toBeNull()
 act(() => form.result.current.clearSaved(form.result.current.snapshot()))
 expect(localStorage.getItem('tj-draft:v1:u:notes')).toBeTruthy()
 act(() => form.result.current.dismiss())
 expect(form.result.current.snapshot()).not.toBeNull()
 act(() => form.result.current.clearSaved(form.result.current.snapshot()))
 expect(localStorage.getItem('tj-draft:v1:u:notes')).toBeNull()
})
