"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const SESSIONS = ["London", "New York", "Asia", "London Close"] as const
const TAGS_TOGGLEABLE = ["Off-plan", "Impulsivo"] as const

type EmotionBefore = "calm" | "anxious" | "excited" | "fearful" | "overconfident"

const EMOTION_OPTIONS: { value: EmotionBefore; label: string }[] = [
  { value: "calm",          label: "Tranquilo" },
  { value: "anxious",       label: "Ansioso" },
  { value: "excited",       label: "Eufórico" },
  { value: "fearful",       label: "Temeroso" },
  { value: "overconfident", label: "Sobreconfiado" },
]

interface Setup {
  id: string
  name: string
  abbreviation: string
  standardChecklist?: string[]
  aplusChecklist?: string[]
}

interface EditTradeModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  trade: {
    id: string
    symbol: string
    direction: string
    entry: number
    stop: number
    target: number
    size: number
    session: string
    notes: string
    tags: string[]
    setupId?: string | null
    // Psychology fields (TASK-034)
    emotionBefore?: string | null
    confidenceRating?: number | null
    executionQuality?: number | null
    fomoFlag?: boolean
    revengeFlag?: boolean
  }
  setups?: Setup[]
  onSave?: (data: Partial<{
    entry: number; stop: number; target: number; size: number
    session: string; notes: string; tags: string[]; setupId: string
    emotionBefore: EmotionBefore | null
    confidenceRating: number | null
    executionQuality: number | null
    fomoFlag: boolean
    revengeFlag: boolean
  }>) => void
  saving?: boolean
}

type Tab = "precios" | "detalles" | "psicologia"

export function EditTradeModal({
  open, onOpenChange, trade, setups = [], onSave, saving
}: EditTradeModalProps) {
  const [tab, setTab] = useState<Tab>("precios")

  const [entry,  setEntry]  = useState(String(trade.entry))
  const [stop,   setStop]   = useState(String(trade.stop))
  const [target, setTarget] = useState(String(trade.target))
  const [size,   setSize]   = useState(String(trade.size))
  const [session, setSession] = useState(trade.session)
  const [notes,   setNotes]   = useState(trade.notes ?? "")
  const [tags,    setTags]    = useState<string[]>(trade.tags ?? [])
  const [setupId, setSetupId] = useState(trade.setupId ?? "")
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  // Psychology fields
  const [emotionBefore,    setEmotionBefore]    = useState<EmotionBefore | null>(
    (trade.emotionBefore as EmotionBefore | null | undefined) ?? null
  )
  const [confidenceRating, setConfidenceRating] = useState<number | null>(trade.confidenceRating ?? null)
  const [executionQuality, setExecutionQuality] = useState<number | null>(trade.executionQuality ?? null)
  const [fomoFlag,         setFomoFlag]         = useState(trade.fomoFlag ?? false)
  const [revengeFlag,      setRevengeFlag]      = useState(trade.revengeFlag ?? false)

  const activeSetup = setups.find(s => s.id === setupId)
  const stdItems  = activeSetup?.standardChecklist ?? []
  const aplusItems = activeSetup?.aplusChecklist ?? []
  const hasChecklist = stdItems.length > 0 || aplusItems.length > 0

  // Reset checklist when setup changes
  useEffect(() => {
    if (!activeSetup) { setChecklist({}); return }
    const initial: Record<string, boolean> = {}
    ;[...stdItems, ...aplusItems].forEach(item => { initial[item] = false })
    setChecklist(initial)
  }, [setupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const toggleCheck = (item: string) =>
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }))

  const handleSave = () => {
    // Build tags from checklist: add "A+" if all A+ items checked
    let finalTags = [...tags]
    if (aplusItems.length > 0 && aplusItems.every(i => checklist[i])) {
      if (!finalTags.includes("A+")) finalTags = [...finalTags, "A+"]
    } else {
      finalTags = finalTags.filter(t => t !== "A+")
    }

    onSave?.({
      entry:   parseFloat(entry)  || trade.entry,
      stop:    parseFloat(stop)   || trade.stop,
      target:  parseFloat(target) || trade.target,
      size:    parseFloat(size)   || trade.size,
      session,
      notes,
      tags:    finalTags,
      setupId: setupId || undefined,
      emotionBefore:    emotionBefore,
      confidenceRating,
      executionQuality,
      fomoFlag,
      revengeFlag,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px]">
        <DialogHeader>
          <DialogTitle>Editar trade — {trade.symbol}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[var(--chip)] rounded-[var(--radius-sm)] p-0.5">
          {(["precios", "detalles", "psicologia"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors capitalize",
                tab === t
                  ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}
            >
              {t === "precios" ? "Precios" : t === "detalles" ? "Detalles" : "Psicología"}
            </button>
          ))}
        </div>

        {tab === "precios" && (
          <div className="flex flex-col gap-3">
            {[
              { label: "Entry",   value: entry,  set: setEntry },
              { label: "Stop",    value: stop,   set: setStop },
              { label: "Target",  value: target, set: setTarget },
              { label: "Tamaño",  value: size,   set: setSize },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--ink-3)] font-medium">{label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  value={value}
                  onChange={e => set(e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {tab === "detalles" && (
          <div className="flex flex-col gap-4">
            {/* Session */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Sesión</label>
              <div className="flex gap-1 flex-wrap">
                {SESSIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSession(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      session === s
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Setup */}
            {setups.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[var(--ink-3)] font-medium">Setup</label>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setSetupId("")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      !setupId
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    Ninguno
                  </button>
                  {setups.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSetupId(s.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                        setupId === s.id
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                      )}
                    >
                      {s.abbreviation} · {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist — appears when setup has items */}
            {hasChecklist && (
              <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <p className="text-[10px] text-[var(--ink-3)] font-semibold uppercase tracking-wide">
                  Checklist — {activeSetup?.abbreviation}
                </p>

                {stdItems.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {stdItems.map(item => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!checklist[item]}
                          onChange={() => toggleCheck(item)}
                          className="accent-[var(--accent)] w-3.5 h-3.5"
                        />
                        <span className="text-xs text-[var(--ink-2)]">{item}</span>
                      </label>
                    ))}
                  </div>
                )}

                {aplusItems.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-[var(--ink-3)] font-semibold mt-1">A+ condiciones</p>
                    {aplusItems.map(item => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!checklist[item]}
                          onChange={() => toggleCheck(item)}
                          className="accent-[var(--accent)] w-3.5 h-3.5"
                        />
                        <span className="text-xs text-[var(--ink-2)]">{item}</span>
                      </label>
                    ))}
                    {aplusItems.every(i => checklist[i]) && aplusItems.length > 0 && (
                      <p className="text-[10px] text-[var(--win)] font-semibold mt-0.5">
                        ★ Setup A+ completo
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Tags</label>
              <div className="flex gap-1 flex-wrap">
                {TAGS_TOGGLEABLE.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      tags.includes(tag)
                        ? "bg-[var(--loss-soft)] text-[var(--loss)]"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Notas</label>
              <textarea
                rows={4}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {tab === "psicologia" && (
          <div className="flex flex-col gap-4">
            {/* Estado emocional */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Estado emocional</label>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setEmotionBefore(null)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    !emotionBefore
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}
                >
                  —
                </button>
                {EMOTION_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setEmotionBefore(value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      emotionBefore === value
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confianza */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Confianza (1-5)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setConfidenceRating(confidenceRating === n ? null : n)}
                    className={cn(
                      "w-9 h-9 rounded-[var(--radius-sm)] text-xs font-bold transition-colors",
                      confidenceRating === n
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Calidad de ejecución */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--ink-3)] font-medium">Calidad de ejecución (1-5)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setExecutionQuality(executionQuality === n ? null : n)}
                    className={cn(
                      "w-9 h-9 rounded-[var(--radius-sm)] text-xs font-bold transition-colors",
                      executionQuality === n
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* FOMO + Revanche */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fomoFlag}
                  onChange={e => setFomoFlag(e.target.checked)}
                  className="accent-[var(--accent)] w-3.5 h-3.5"
                />
                <span className="text-xs text-[var(--ink-2)]">¿FOMO?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revengeFlag}
                  onChange={e => setRevengeFlag(e.target.checked)}
                  className="accent-[var(--accent)] w-3.5 h-3.5"
                />
                <span className="text-xs text-[var(--ink-2)]">¿Revanche?</span>
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="md"
            className="bg-[var(--accent)] text-white hover:opacity-90"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
