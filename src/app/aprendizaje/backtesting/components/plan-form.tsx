"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { backtestPlanInput, type BacktestPlan, type BacktestPlanInput } from "@/domains/learning/backtest-session"
import { trpc } from "@/lib/trpc/client"
import { Label, NotesField, panel, selectClass, TextField } from "./fields"

type Objective = BacktestPlanInput["objectives"][number]
const blankObjective: Objective = { title: "", criterion: "", metric: "manual", threshold: 1, minSample: 1 }

export function PlanForm({ initial, setupId, criterion, onSaved }: {
  initial?: { id: string; revision: number; plan: BacktestPlan };
  setupId?: string; criterion?: string; onSaved: (id: string) => void | Promise<void>;
}) {
  const options = trpc.backtestSessions.options.useQuery()
  const [chosen, setChosen] = useState(initial?.plan.setup?.id ?? setupId ?? "")
  const setup = options.data?.setups.find(s => s.id === chosen)
  const [plan, setPlan] = useState<BacktestPlanInput>(() => initial?.plan ?? { title: "", hypothesis: "", symbols: "", timeframe: "", from: "", to: "", rules: "", invalidation: "", exitRules: "", assumptions: "", objectives: [criterion ? { ...blankObjective, title: criterion, criterion: "Revisar la evidencia del criterio en Playbook" } : blankObjective] })
  const [error, setError] = useState("")
  const create = trpc.backtestSessions.create.useMutation()
  const save = trpc.backtestSessions.savePlan.useMutation()
  const source = chosen === (initial?.plan.setup?.id ?? setupId) ? initial?.plan.setup?.criterion ?? criterion ?? null : null
  const set = <K extends keyof BacktestPlanInput>(key: K, value: BacktestPlanInput[K]) => setPlan(prev => ({ ...prev, [key]: value }))
  const updateObjective = (i: number, patch: Partial<Objective>) => setPlan(p => ({ ...p, objectives: p.objectives.map((o, k) => k === i ? { ...o, ...patch } : o) }))
  const busy = create.isPending || save.isPending
  return <form className={`${panel} space-y-4`} onSubmit={async e => {
    e.preventDefault(); setError("")
    const parsed = backtestPlanInput.safeParse({ ...plan, title: plan.title || setup?.name || "", hypothesis: plan.hypothesis || setup?.description || "", symbols: plan.symbols || setup?.market || "" })
    if (!parsed.success) { setError(`Revisa ${parsed.error.issues[0]?.path.join(" · ") || "el plan"}. ${parsed.error.issues[0]?.message}`); return }
    if (options.data && parsed.data.to > options.data.today) { setError("El rango histórico debe terminar a más tardar hoy."); return }
    const data = { plan: parsed.data, setupId: chosen || null, criterion: source }
    try { const row = initial ? await save.mutateAsync({ ...data, id: initial.id, revision: initial.revision }) : await create.mutateAsync(data); await onSaved(row.id) }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el plan.") }
  }}>
    <h2 className="text-lg font-semibold">{initial ? "Editar plan" : "Planificar sesión"}</h2>
    <Label text="Setup del Playbook"><select className={selectClass} value={chosen} onChange={e => {
      const picked = options.data?.setups.find(s => s.id === e.target.value)
      setChosen(e.target.value)
      if (picked) setPlan(p => ({ ...p, title: p.title || picked.name, symbols: p.symbols || picked.market, hypothesis: p.hypothesis || picked.description }))
    }}><option value="">Sesión independiente</option>{options.data?.setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}{chosen && !options.data?.setups.some(s => s.id === chosen) && <option value={chosen}>{initial?.plan.setup?.name ?? "Setup del Playbook"}</option>}</select></Label>
    {source && <p className="text-sm text-[var(--ink-2)]">Criterio de Playbook · {source}</p>}
    {options.error && <p role="alert">No se pudieron cargar los setups. <Button type="button" variant="link" onClick={() => void options.refetch()}>Reintentar</Button></p>}
    <TextField label="Nombre de la sesión" value={plan.title} onChange={v => set("title", v)} />
    {setup && !plan.title && <Button type="button" size="sm" onClick={() => setPlan(p => ({ ...p, title: setup.name, symbols: p.symbols || setup.market, hypothesis: p.hypothesis || setup.description }))}>Usar definición de {setup.name}</Button>}
    <NotesField label="Hipótesis" value={plan.hypothesis} onChange={v => set("hypothesis", v)} />
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Mercado o símbolos" value={plan.symbols} onChange={v => set("symbols", v)} maxLength={120} />
      <TextField label="Temporalidad" value={plan.timeframe} onChange={v => set("timeframe", v)} maxLength={50} required />
      <TextField label="Fecha inicial del mercado" type="date" value={plan.from} onChange={v => set("from", v)} max={options.data?.today} required />
      <TextField label="Fecha final del mercado" type="date" value={plan.to} onChange={v => set("to", v)} max={options.data?.today} required />
      <NotesField label="Reglas de entrada" value={plan.rules} onChange={v => set("rules", v)} />
      <NotesField label="Invalidación" value={plan.invalidation} onChange={v => set("invalidation", v)} />
      <NotesField label="Reglas de salida" value={plan.exitRules} onChange={v => set("exitRules", v)} />
      <NotesField label="Supuestos de ejecución" value={plan.assumptions} onChange={v => set("assumptions", v)} />
    </div>
    <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Objetivos</legend>
      {plan.objectives.map((o, i) => <div key={i} className="grid gap-3 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-2">
        <TextField label={`Objetivo ${i + 1}`} value={o.title} onChange={v => updateObjective(i, { title: v })} maxLength={180} required />
        <Label text="Forma de evaluación"><select className={selectClass} value={o.metric} onChange={e => updateObjective(i, { metric: e.target.value as Objective["metric"], threshold: 1 })}><option value="manual">Evaluación manual</option><option value="closed">Mínimo de operaciones cerradas</option><option value="checklist">Cumplimiento del checklist (%)</option><option value="expectancy">Expectativa en R</option></select></Label>
        <NotesField label="Criterio de éxito" value={o.criterion} onChange={v => updateObjective(i, { criterion: v })} maxLength={1000} required />
        {o.metric !== "manual" && <div className="grid gap-2 sm:grid-cols-2"><Label text="Umbral mínimo"><Input type="number" step={o.metric === "closed" ? "1" : "0.001"} required value={o.threshold} onChange={e => updateObjective(i, { threshold: Number(e.target.value) })} /></Label>
          {o.metric !== "closed" && <Label text="Muestra mínima"><Input type="number" min={1} max={250} required value={o.minSample} onChange={e => updateObjective(i, { minSample: Number(e.target.value) })} /></Label>}</div>}
        {plan.objectives.length > 1 && <Button type="button" size="sm" onClick={() => set("objectives", plan.objectives.filter((_, k) => k !== i))}>Quitar objetivo {i + 1}</Button>}
      </div>)}
      <Button type="button" size="sm" disabled={plan.objectives.length >= 10} onClick={() => set("objectives", [...plan.objectives, { ...blankObjective }])}>Añadir objetivo</Button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-[var(--loss)]">{error}</p>}
    <Button type="submit" variant="primary" loading={busy}>Guardar borrador</Button>
  </form>
}
