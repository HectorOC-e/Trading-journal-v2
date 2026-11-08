// @vitest-environment jsdom
import React from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { SessionHistory } from '@/app/aprendizaje/components/session-history'
const mock = vi.hoisted(() => ({ query: {} as any, revise: vi.fn(), void: vi.fn(), retry: vi.fn(), more: vi.fn(), invalidate: vi.fn(), reviseOptions: {} as any, voidOptions: {} as any }))
vi.mock('@/lib/trpc/client', () => ({ trpc: { profile: { get: { useQuery: () => ({ data: { timezone: 'America/Los_Angeles' } }) } }, useUtils: () => ({ studySessions: { invalidate: mock.invalidate }, learningResources: { invalidate: mock.invalidate } }), studySessions: { history: { useInfiniteQuery: () => mock.query }, reviseCompleted: { useMutation: (o: any) => { mock.reviseOptions = o; return { mutate: mock.revise, isPending: false } } }, voidCompleted: { useMutation: (o: any) => { mock.voidOptions = o; return { mutate: mock.void, isPending: false } } } } } }))
const item = { id: 'one', resourceTitle: 'Libro', resourceType: 'BOOK', status: 'completed', startedAt: '2026-11-02T01:00:00Z', endedAt: '2026-11-02T01:30:00Z', durationMin: 30, note: 'Antes', updatedAt: 'version', revisionCount: 2, canAdjustProgress: true, needsProgressConfirmation: false, progressLabel: 'Minutos' }
beforeEach(() => { cleanup(); vi.clearAllMocks(); mock.query = { data: { pages: [{ items: [item], nextCursor: 'two' }] }, hasNextPage: true, fetchNextPage: mock.more, refetch: mock.retry } })
it('edits minutes and notes with version and known progress enabled', () => { render(<SessionHistory />); expect(screen.getByText(/2 correcciones/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Editar' })); fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '45' } }); fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Después' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })); expect(mock.revise).toHaveBeenCalledWith({ id: 'one', durationMin: 45, note: 'Después', expectedUpdatedAt: 'version', adjustProgress: true }); act(() => mock.reviseOptions.onSuccess()); expect(mock.invalidate).toHaveBeenCalledTimes(2) })
it('requires explicit legacy progress opt in and void confirmation', () => { mock.query.data.pages[0].items = [{ ...item, needsProgressConfirmation: true }]; render(<SessionHistory />); fireEvent.click(screen.getByRole('button', { name: 'Anular' })); const checkbox = screen.getByRole('checkbox') as HTMLInputElement; expect(checkbox.checked).toBe(false); expect(mock.void).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' })); expect(mock.void).toHaveBeenCalledWith({ id: 'one', expectedUpdatedAt: 'version', adjustProgress: false }) })
it('retains cached sessions with retry and load more', () => { mock.query.isError = true; render(<SessionHistory />); expect(screen.getByText('Libro')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(mock.retry).toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Cargar más' })); expect(mock.more).toHaveBeenCalled() })
it('shows voided sessions without edit controls', () => { mock.query.data.pages[0].items = [{ ...item, status: 'voided' }]; render(<SessionHistory />); expect(screen.getByText(/Anulada/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull() })

it('uses the profile calendar and displays mutation errors without closing the form', () => { render(<SessionHistory />); expect(screen.getByText(/1 nov 2026/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Editar' })); fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })); act(() => mock.reviseOptions.onError({ message: 'Conflicto: recarga la sesión' })); expect(screen.getByRole('alert').textContent).toContain('Conflicto'); expect(screen.getByRole('dialog')).toBeTruthy(); })

it('allows corrections longer than 24 hours', () => { render(<SessionHistory />); fireEvent.click(screen.getByRole('button', { name: 'Editar' })); fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '1441' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })); expect(mock.revise).toHaveBeenCalledWith(expect.objectContaining({ durationMin: 1441 })); })

it('saves a note correction for a zero-minute session and rejects blank minutes', () => {
  mock.query.data.pages[0].items = [{ ...item, durationMin: 0 }]
  render(<SessionHistory />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Nota corregida' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(mock.revise).toHaveBeenCalledWith(expect.objectContaining({ durationMin: 0, note: 'Nota corregida' }))
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '' } })
  expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(true)
})

it('keeps the conflicting draft until explicit refresh and uses the new version next time', async () => {
  render(<SessionHistory />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Mi borrador' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  act(() => mock.reviseOptions.onError({ message: 'Otra pestaña cambió la sesión', data: { code: 'CONFLICT' } }))
  expect((screen.getByLabelText('Nota') as HTMLTextAreaElement).value).toBe('Mi borrador')
  expect(mock.retry).not.toHaveBeenCalled()
  mock.retry.mockImplementationOnce(async () => { mock.query.data.pages[0].items = [{ ...item, updatedAt: 'version-new', note: 'Versión actual' }]; return { isError: false } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar historial' })) })
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect((screen.getByLabelText('Nota') as HTMLTextAreaElement).value).toBe('Versión actual')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(mock.revise).toHaveBeenLastCalledWith(expect.objectContaining({ expectedUpdatedAt: 'version-new', note: 'Versión actual' }))
})

it('preserves the draft when conflict refresh fails', async () => {
  render(<SessionHistory />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Mi borrador' } })
  act(() => mock.reviseOptions.onError({ message: 'Conflicto', data: { code: 'CONFLICT' } }))
  mock.retry.mockResolvedValueOnce({ isError: true })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar historial' })) })
  expect((screen.getByLabelText('Nota') as HTMLTextAreaElement).value).toBe('Mi borrador')
  expect(screen.getByRole('alert').textContent).toContain('No se pudo actualizar')
})
it('routes practice completion markers to the practice editor without independent edit or void controls',()=>{
 mock.query.data.pages[0].items=[{...item,source:'practice',durationMin:0}]
 render(<SessionHistory />)
 expect(screen.queryByRole('button',{name:'Editar'})).toBeNull()
 expect(screen.queryByRole('button',{name:'Anular'})).toBeNull()
 expect(screen.getByRole('link',{name:'Gestionar en Prácticas'})).toHaveAttribute('href','/aprendizaje?tab=practicas')
})
