"use client"
import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Card, Eyebrow } from "./primitives"
import { addDaysISO } from "@/lib/datetime/local"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { ReviewSource } from "@/domains/learning/review-source"
const statuses: Record<string,string> = {active:"En curso",kept:"Cumplido",partial:"Parcial",broken:"No cumplido",expired:"Sin evidencia suficiente",planned:"Pendiente de practicar",completed:"Realizada",cancelled:"Cancelada"}
function SourceLink({source}:{source:ReviewSource|null}) { return source ? <Link className="text-xs text-[var(--accent)] underline" href={`/reviews/semanal/${source.weekStart}`}>Review de origen</Link> : null }
export function ReviewContinuity({weekStart,initialConclusion}:{weekStart:string;initialConclusion:string}) {
 const q=trpc.weeklyReviews.followUp.useQuery({weekStart})
 const resources=trpc.learningResources.list.useQuery()
 const utils=trpc.useUtils()
 const [open,setOpen]=useState(false),[kind,setKind]=useState("commitment")
 const [conclusion,setConclusion]=useState(initialConclusion.slice(0,1000))
 const [insightType,setInsightType]=useState<"intraday-decay"|"revenge-trading"|"oversizing"|"off-plan">("revenge-trading")
 const [resourceId,setResourceId]=useState(""),[date,setDate]=useState(addDaysISO(weekStart,7)),[minutes,setMinutes]=useState(30)
 const [requestId,setRequestId]=useState(""),[error,setError]=useState("")
 const create=trpc.weeklyReviews.createCommitment.useMutation(),plan=trpc.weeklyReviews.planPractice.useMutation()
 const busy=create.isPending||plan.isPending
 async function save() {
  setError("")
  const source={kind:"weekly" as const,weekStart,conclusion}
  try {
   if(kind==="commitment") await create.mutateAsync({id:requestId,source,insightType})
   else await plan.mutateAsync({id:requestId,source,resourceId,date,plannedMin:minutes})
   await utils.weeklyReviews.followUp.invalidate({weekStart});setOpen(false)
  }catch(e){setError(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))}
 }
 const field="block w-full mt-1 rounded border border-[var(--line)] bg-[var(--panel-2)] p-2 text-sm"
 return <Card>
  <div className="flex items-center justify-between gap-3 mb-3"><Eyebrow>De la reflexión a la práctica</Eyebrow><Button size="sm" onClick={()=>{setRequestId(crypto.randomUUID());setError("");setOpen(true)}}>Convertir conclusión en acción</Button></div>
  <p className="text-xs text-[var(--ink-3)] mb-3">Acciones de origen y seguimiento durante la semana seleccionada.</p>
  {q.isLoading&&<p role="status">Cargando seguimiento…</p>}
  {q.error&&<p role="alert">No se pudo cargar el seguimiento. <Button variant="link" size="sm" onClick={()=>void q.refetch()}>Reintentar</Button></p>}
  {q.data&&[{title:"Acciones de esta review · estado actual",actions:q.data.originActions,current:true},{title:"Seguimiento durante esta semana",actions:q.data,current:false}].map(group=><section key={group.title} className="mt-4"><h3 className="text-sm font-semibold mb-2">{group.title}</h3><ul className="space-y-3">
   {group.actions.commitments.map(c=><li key={c.id} className="border-t border-[var(--line)] pt-2"><p className="text-sm">{c.text}</p>{c.reviewSource&&<p className="text-xs text-[var(--ink-3)]">Conclusión: {c.reviewSource.conclusion}</p>}<p className="text-xs text-[var(--ink-3)]">{statuses[c.status]??c.status}{c.observedValue!==null?` · Medido ${c.observedValue} (objetivo ${c.comparator} ${c.target})`:""}</p><SourceLink source={c.reviewSource}/></li>)}
   {group.actions.plans.map(p=><li key={p.id} className="border-t border-[var(--line)] pt-2"><p className="text-sm">{p.reviewSource?.conclusion??p.title}</p><p className="text-xs text-[var(--ink-3)]">{statuses[p.status]??p.status} · {p.date} · {p.plannedMin} min</p><SourceLink source={p.reviewSource}/>{group.current&&p.status==="planned"&&<Link className="ml-3 text-xs text-[var(--accent)] underline" href={`/aprendizaje?tab=practicas&plannedSessionId=${p.id}`}>Registrar práctica realizada</Link>}</li>)}
   {group.actions.practices.map(p=><li key={p.id} className="border-t border-[var(--line)] pt-2"><p className="text-sm">{p.title}</p><p className="text-xs">Autoevaluación: {p.assessment==="achieved"?"Lo logré":p.assessment==="partial"?"Parcialmente":p.assessment==="repeat"?"Necesito repetir":"Sin evaluar"}</p><SourceLink source={p.reviewSource}/></li>)}
   {!group.actions.commitments.length&&!group.actions.plans.length&&!group.actions.practices.length&&<li className="text-sm text-[var(--ink-3)]">Todavía no hay acciones vinculadas.</li>}
  </ul></section>)}
  <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v)}}><DialogContent><DialogHeader><DialogTitle>Convertir conclusión en acción</DialogTitle><DialogDescription>Guarda primero tus notas. El compromiso se mide durante los próximos siete días; la práctica programada se registra al realizarla.</DialogDescription></DialogHeader>
   <div className="space-y-3"><label className="text-sm">Conclusión<textarea className={field} maxLength={1000} value={conclusion} onChange={e=>setConclusion(e.target.value)}/></label>
   <label className="block text-sm">Acción<select className={field} value={kind} onChange={e=>setKind(e.target.value)}><option value="commitment">Compromiso medible</option><option value="practice">Programar práctica</option></select></label>
   {kind==="commitment"?<label className="block text-sm">Qué verificar<select className={field} value={insightType} onChange={e=>setInsightType(e.target.value as typeof insightType)}><option value="revenge-trading">Cero trades de revancha tras pérdidas</option><option value="intraday-decay">No superar dos trades por día</option><option value="oversizing">Respetar límite de riesgo por trade</option><option value="off-plan">Operar dentro del plan</option></select></label>:<><label className="block text-sm">Recurso<select className={field} value={resourceId} onChange={e=>setResourceId(e.target.value)}><option value="">Elige un recurso</option>{resources.data?.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>{!resources.data?.length&&<Link className="text-xs underline" href="/aprendizaje">Añadir un recurso para practicar</Link>}<label className="block text-sm">Fecha<input type="date" className={field} value={date} onChange={e=>setDate(e.target.value)}/></label><label className="block text-sm">Minutos previstos<input type="number" min={5} max={480} className={field} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label></>}
   {error&&<p role="alert" className="text-sm text-[var(--loss)]">{error}</p>}</div><DialogFooter><Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="primary" disabled={busy||!conclusion.trim()||(kind==="practice"&&!resourceId)} onClick={()=>void save()}>{busy?"Guardando…":"Crear acción"}</Button></DialogFooter></DialogContent></Dialog>
 </Card>
}
