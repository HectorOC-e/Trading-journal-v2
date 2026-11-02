"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Pause, Play, Square, Minimize2, Search, GraduationCap } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CategoryChip } from "@/components/ui/category-chip"
import { useStudySessionStore } from "@/lib/study-session-store"
import { elapsedStudySeconds, restoreStudyTimer, toggleStudyPause, type StudyTimer } from "@/lib/study-timer"
import { isResourceReviewDue } from "@/domains/learning/services/review-queue"
import { localDateISO, safeTimeZone } from "@/lib/datetime/local"
import type { ResourceType } from "@/types"

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/**
 * The single owner of a running study session — mounted once in the AppShell so
 * the timer survives navigation. Renders the resource picker, the focus overlay,
 * or the floating pill depending on store state.
 */
export function FocusSession() {
  const { session, minimized, pickerOpen, setSession, setMinimized, closePicker } = useStudySessionStore()
  const utils = trpc.useUtils()
  const closedSessions = useRef(new Set<string>())

  // Resume an active session on load (e.g. after a reload).
  const { data: active, dataUpdatedAt } = trpc.studySessions.active.useQuery(undefined, {
    staleTime: 0, refetchOnWindowFocus: true, refetchInterval: session ? 5000 : false,
  })

  // Keep timer transitions and draft edits in one snapshot; ticks need no writes.
  const [timer, setTimer] = useState<StudyTimer | null>(null)
  const timerRef = useRef<StudyTimer | null>(null)
  const note = timer?.sessionId === session?.id ? timer?.note ?? "" : ""
  const markReview = timer?.sessionId === session?.id ? timer?.markForReview ?? false : false
  const [now, setNow] = useState(0)
  const initedFor = useRef<string | null>(null)
  const paused = timer?.paused ?? false
  const storageKey = session ? `tj-study-timer:${session.id}` : null

  useEffect(() => {
    if (session && initedFor.current !== session.id) {
      initedFor.current = session.id
      let saved: string | null = null
      try { saved = localStorage.getItem(`tj-study-timer:${session.id}`) } catch { /* optional */ }
      if (saved === null) {
        try { saved = sessionStorage.getItem(`tj-study-timer:${session.id}`) } catch { /* optional */ }
      }
      timerRef.current = restoreStudyTimer(saved, session.id, session.startedAtMs)
      setTimer(timerRef.current)
      try { localStorage.setItem(`tj-study-timer:${session.id}`, JSON.stringify(timerRef.current)) } catch { /* optional */ }
    }
    if (!session) { initedFor.current = null; timerRef.current = null; setTimer(null) }
  }, [session])

  useEffect(() => {
    if (!session) return
    const key = `tj-study-timer:${session.id}`
    const receive = (event: StorageEvent) => {
      if (event.key !== key) return
      if (event.newValue === null) {
        closedSessions.current.add(session.id)
        try { sessionStorage.removeItem(key) } catch { /* optional */ }
        setSession(null)
        void utils.studySessions.invalidate()
        void utils.learningResources.invalidate()
        return
      }
      try {
        const saved = JSON.parse(event.newValue)
        if (saved?.sessionId !== session.id) return
        const next = restoreStudyTimer(event.newValue, session.id, session.startedAtMs)
        timerRef.current = next
        setTimer(next)
        setNow(Date.now())
        sessionStorage.setItem(key, JSON.stringify(next))
      } catch { /* Ignore malformed or unavailable storage. */ }
    }
    window.addEventListener("storage", receive)
    return () => window.removeEventListener("storage", receive)
  }, [session, setSession, utils])

  useEffect(() => {
    if (active && !closedSessions.current.has(active.id) && active.id !== session?.id) {
      setSession({ id: active.id, resourceId: active.resourceId, resourceTitle: active.resourceTitle, resourceType: active.resourceType, startedAtMs: Date.parse(active.startedAt) })
    } else if (active === null && dataUpdatedAt && session) {
      closedSessions.current.add(session.id)
      // A fresh server response reconciles sessions ended outside this tab.
      try { localStorage.removeItem(`tj-study-timer:${session.id}`) } catch { /* optional */ }
      try { sessionStorage.removeItem(`tj-study-timer:${session.id}`) } catch { /* optional */ }
      setSession(null)
    }
    // Changes to the local store alone must not reapply an older server snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dataUpdatedAt])

  useEffect(() => {
    if (!session || paused) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [session, paused])

  const elapsedSec = session && timer?.sessionId === session.id ? elapsedStudySeconds(timer, now) : 0
  function clearTimerStorage(sessionId: string) {
    closedSessions.current.add(sessionId)
    const key = `tj-study-timer:${sessionId}`
    try { localStorage.removeItem(key) } catch { /* optional */ }
    try { sessionStorage.removeItem(key) } catch { /* optional */ }
    if (useStudySessionStore.getState().session?.id === sessionId) setSession(null)
  }

  const startMut = trpc.studySessions.start.useMutation({
    onSuccess: async (s) => {
      await utils.studySessions.active.cancel()
      utils.studySessions.active.setData(undefined, s)
      setSession({ id: s.id, resourceId: s.resourceId, resourceTitle: s.resourceTitle, resourceType: s.resourceType, startedAtMs: Date.parse(s.startedAt) })
    },
    onError: () => toast.error("No se pudo iniciar la sesión"),
  })
  const finishMut = trpc.studySessions.finish.useMutation({
    // A lost acknowledgement can be retried safely: finish is idempotent.
    retry: (failures, error) => failures < 1 && (!error.data || error.data.code === "INTERNAL_SERVER_ERROR" || error.data.code === "TIMEOUT"),
    onSuccess: (_, input) => {
      utils.studySessions.invalidate(); utils.learningResources.invalidate()
      clearTimerStorage(input.id)
      toast.success(`Sesión guardada · ${input.durationMin} min`)
    },
    onError: () => toast.error("No se pudo guardar la sesión"),
  })
  const cancelMut = trpc.studySessions.cancel.useMutation({ onSuccess: (_, input) => { clearTimerStorage(input.id); void utils.studySessions.invalidate() } })

  function persistTimer(next: StudyTimer) {
    timerRef.current = next
    setTimer(next)
    try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* optional */ }
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* optional */ }
  }
  function updateDraft(draft: Partial<Pick<StudyTimer, "note" | "markForReview">>) {
    const current = timerRef.current
    if (!current || current.sessionId !== session?.id) return
    persistTimer({ ...current, ...draft })
  }
  function togglePause() {
    const current = timerRef.current
    if (!current || current.sessionId !== session?.id) return
    persistTimer(toggleStudyPause(current, Date.now()))
  }
  function finish() {
    if (!session || !timer || finishMut.isPending) return
    finishMut.mutate({ id: session.id, durationMin: Math.max(1, Math.round(elapsedStudySeconds(timer, Date.now()) / 60)), note, markForReview: markReview })
  }
  function discard() {
    if (!session) return
    cancelMut.mutate({ id: session.id })
  }

  return (
    <>
      {pickerOpen && <ResourcePicker onPick={(id) => startMut.mutate({ resourceId: id })} onClose={closePicker} />}

      <AnimatePresence>
        {session && !minimized && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[var(--bg)]/80 backdrop-blur-md"
          >
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <button onClick={() => setMinimized(true)} title="Minimizar" aria-label="Minimizar"
                className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-95">
                <Minimize2 size={17} />
              </button>
            </div>

            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
              className="flex flex-col items-center gap-5 px-6 text-center max-w-md w-full">
              <CategoryChip type={session.resourceType as ResourceType} />
              <p className="text-[15px] font-semibold text-[var(--ink)] leading-tight">{session.resourceTitle}</p>

              <div className="font-mono font-bold tabular-nums tracking-tight text-[var(--accent)]" style={{ fontSize: 56, lineHeight: 1 }}>
                {fmt(elapsedSec)}
              </div>
              {paused && <p className="text-[12px] text-[var(--be)] -mt-3">En pausa</p>}

              <textarea
                value={note} onChange={e => updateDraft({ note: e.target.value.slice(0, 2000) })} maxLength={2000} rows={2}
                placeholder="Nota rápida de la sesión…"
                className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />

              <label className="flex items-center gap-2 text-[12px] text-[var(--ink-2)] cursor-pointer select-none">
                <input type="checkbox" checked={markReview} onChange={e => updateDraft({ markForReview: e.target.checked })} className="accent-[var(--accent)]" />
                Marcar para repaso al terminar
              </label>

              <div className="flex items-center gap-2 mt-1">
                <button onClick={togglePause}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--chip)] transition-colors active:scale-[0.97]">
                  {paused ? <><Play size={15} /> Reanudar</> : <><Pause size={15} /> Pausar</>}
                </button>
                <button onClick={finish} disabled={finishMut.isPending}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] font-medium hover:bg-[var(--accent-h)] transition-colors active:scale-[0.97] disabled:opacity-50">
                  <Square size={14} className="fill-current" /> Terminar
                </button>
              </div>
              <button onClick={discard} className="text-[11px] text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors">Descartar sesión</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {session && minimized && (
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            onClick={() => setMinimized(false)}
            className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-[60] inline-flex items-center gap-2 h-10 pl-3 pr-2 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-lg)] active:scale-[0.97]"
          >
            <span className={cn("w-2 h-2 rounded-full bg-[var(--accent-contrast)]", !paused && "animate-pulse")} />
            <span className="font-mono font-semibold tabular-nums text-[13px]">{fmt(elapsedSec)}</span>
            <span className="text-[12px] max-w-[120px] truncate opacity-90">{session.resourceTitle}</span>
            <span onClick={(e) => { e.stopPropagation(); finish() }} role="button" aria-label="Terminar sesión"
              className="ml-1 w-7 h-7 flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 transition-colors">
              <Square size={12} className="fill-current" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Resource picker ───────────────────────────────────────────────────────────
// The single "session" launcher. Reviews due today (nextReviewAt ≤ hoy or marked
// for review) are surfaced first so a focus session naturally starts on what's
// pending — the unified flow replaces the old separate "Iniciar sesión" review.
function ResourcePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const { data: resources = [], isLoading } = trpc.learningResources.list.useQuery()
  const [q, setQ] = useState("")
  const { data: profile } = trpc.profile.get.useQuery()
  const today = localDateISO(new Date(), safeTimeZone(profile?.timezone))
  const { due, rest } = useMemo(() => {
    let active = resources.filter(r => r.status !== "ABANDONED" && (r.status !== "MASTERED" || r.markedForReview))
    if (q.trim()) {
      const s = q.toLowerCase()
      active = active.filter(r => r.title.toLowerCase().includes(s) || r.author.toLowerCase().includes(s))
    }
    const isDue = (r: typeof active[number]) => isResourceReviewDue(r, today)
    return { due: active.filter(isDue), rest: active.filter(r => !isDue(r)) }
  }, [resources, q, today])

  const Row = (r: typeof rest[number]) => (
    <button key={r.id} onClick={() => onPick(r.id)}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-left hover:bg-[var(--panel-2)] active:bg-[var(--accent-soft)] transition-colors">
      <CategoryChip type={r.type as ResourceType} />
      <span className="flex-1 min-w-0 text-[13px] text-[var(--ink)] truncate">{r.title}</span>
      {(isResourceReviewDue(r, today)) && (
        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--loss-soft)] text-[var(--loss)]">vence</span>
      )}
    </button>
  )

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GraduationCap size={16} /> ¿Qué vas a estudiar?</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar recurso…"
            className="w-full h-9 pl-8 pr-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-[13px] text-[var(--ink-3)] py-6 text-center">Cargando…</p>
          ) : due.length + rest.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-3)] py-6 text-center">Sin recursos. Añade uno primero.</p>
          ) : (
            <>
              {due.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--loss)] px-2.5 pt-1 pb-0.5">Vencidas para repaso · {due.length}</p>
                  {due.map(Row)}
                  {rest.length > 0 && <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] px-2.5 pt-3 pb-0.5">Todos</p>}
                </>
              )}
              {rest.map(Row)}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
