// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PracticesTab } from '@/app/aprendizaje/components/practices-tab'
const m = vi.hoisted(() => ({ plan: undefined as unknown, error: null as Error | null, day: true, refetch: vi.fn(), invalidates: vi.fn() }))
vi.mock('@/lib/trpc/client', () => ({trpc: {
 learningResources: {list: {useQuery: () => ({data: []})}},
 learningPractices: { list: {useInfiniteQuery: () => ({data:{pages:[{items:[]}]}})}, summary: {useQuery: () => ({data: m.day ? {today:'2026-11-06',timezone:'UTC'} : undefined})}},
 studySessions: {getPlan: {useQuery: () => ({data:m.plan,error:m.error,isLoading:!m.plan&&!m.error,refetch:m.refetch})}},
 useUtils: () => ({learningPractices:{invalidate:m.invalidates},studySessions:{home:{invalidate:m.invalidates}},today:{plan:{invalidate:m.invalidates}},weeklyReviews:{followUp:{invalidate:m.invalidates}}})
}}))
vi.mock('@/app/aprendizaje/modals/practice-modal', () => ({PracticeModal: (p: {plannedSession?: {id:string;reviewSource:{conclusion:string}};onClose:()=>void;onChanged:()=>void}) => <div role="dialog"><p>{p.plannedSession?.reviewSource.conclusion ?? 'Manual'}</p><button onClick={p.onClose}>Cerrar práctica</button><button onClick={p.onChanged}>Guardada</button></div>}))
beforeEach(() => {m.plan=undefined;m.error=null;m.day=true;m.invalidates.mockClear();window.history.replaceState({},'', '/aprendizaje?tab=practicas&plannedSessionId=plan')})
afterEach(cleanup)
it('waits for owned plan and calendar then retains the opened plan during refetch', async () => {
 const view=render(<PracticesTab plannedSessionId="plan" registerOnOpen />)
 expect(screen.queryByRole('dialog')).toBeNull()
 m.plan={id:'plan',resourceId:'resource',reviewSource:{kind:'weekly',weekStart:'2026-11-02',conclusion:'Medir paciencia'}};m.day=false
 view.rerender(<PracticesTab plannedSessionId="plan" registerOnOpen />);expect(screen.queryByRole('dialog')).toBeNull()
 m.day=true;view.rerender(<PracticesTab plannedSessionId="plan" registerOnOpen />)
 await waitFor(() => expect(screen.getByText('Medir paciencia')).toBeTruthy())
 m.plan=undefined;m.error=Error('completed');view.rerender(<PracticesTab plannedSessionId="plan" registerOnOpen />)
 expect(screen.getByText('Medir paciencia')).toBeTruthy()
 fireEvent.click(screen.getByText('Guardada'));expect(m.invalidates).toHaveBeenCalledTimes(4)
 fireEvent.click(screen.getByText('Cerrar práctica'));expect(window.location.search).not.toContain('plannedSessionId')
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('unavailable plans never open blank forms and late queries cannot replace manual entry', () => {
 m.error=Error('Unavailable')
 const view=render(<PracticesTab plannedSessionId="plan" registerOnOpen />)
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('button',{name:'Reintentar planificación'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Registrar práctica'}));expect(screen.getByText('Manual')).toBeTruthy()
 m.error=null;m.plan={id:'plan',resourceId:'resource',reviewSource:{conclusion:'Late'}}
 view.rerender(<PracticesTab plannedSessionId="plan" registerOnOpen />)
 expect(screen.getByText('Manual')).toBeTruthy();expect(screen.queryByText('Late')).toBeNull()
})
