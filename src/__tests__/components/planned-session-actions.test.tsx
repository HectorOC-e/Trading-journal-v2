// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PlannedSessionActions } from '@/app/aprendizaje/components/planned-session-actions'
const m=vi.hoisted(()=>({cancel:vi.fn(),done:vi.fn()}))
vi.mock('@/lib/trpc/client',()=>({trpc:{studySessions:{cancelPlanned:{useMutation:()=>({mutate:m.cancel,isPending:false})},completePlanned:{useMutation:()=>({mutate:m.done,isPending:false})}},useUtils:()=>({studySessions:{invalidate:vi.fn()},learningResources:{invalidate:vi.fn()}})}}))
vi.mock('@/app/aprendizaje/components/plan-session-modal',()=>({PlanSessionModal:({open,editPlan}:{open:boolean,editPlan:{id:string}})=>open?<p>Editing plan {editPlan.id}</p>:null}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const plan={id:'p',resourceId:'r',title:'Book',date:'2026-12-01',plannedMin:30}
it('requires confirmation before cancelling a plan',()=>{render(<PlannedSessionActions plan={plan}/>);fireEvent.click(screen.getByRole('button',{name:'Cancelar plan Book'}));expect(m.cancel).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Cancelar plan'}));expect(m.cancel).toHaveBeenCalledWith({id:'p'})})
it('opens the selected plan for editing and completes the same row',()=>{render(<PlannedSessionActions plan={plan}/>);fireEvent.click(screen.getByRole('button',{name:'Reprogramar Book'}));expect(screen.getByText('Editing plan p')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'30m · hecho'}));expect(m.done).toHaveBeenCalledWith({id:'p'})})
