/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Page from '@/app/notificaciones/page'
const mocks = vi.hoisted(() => ({ fetchNextPage: vi.fn(), refetch: vi.fn(), query: { data: { pages: [{ items: [{ id: 'one', title: 'First notice', body: 'Saved row', createdAt: new Date().toISOString() }] }] }, hasNextPage: true, isLoading: false, isFetching: false, isFetchNextPageError: true, error: new Error('Load failed') } }))
vi.mock('@/components/layout/top-bar', () => ({ TopBar: () => null }))
vi.mock('@/components/notifications/notification-item', () => ({ NotificationItem: ({ n }: {n: {title: string}}) => <p>{n.title}</p> }))
vi.mock('@/lib/trpc/client', () => ({ trpc: {
  useUtils: () => ({ notifications: { list: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
  notifications: { list: { useInfiniteQuery: vi.fn((input, options) => { expect(input.limit).toBe(30); expect(options.getNextPageParam({ nextCursor: 'next' })).toBe('next'); return { ...mocks.query, fetchNextPage: mocks.fetchNextPage, refetch: mocks.refetch } }) }, unreadCount: { useQuery: () => ({ data: 0 }) }, markRead: { useMutation: () => ({ mutate: vi.fn() }) }, markAllRead: { useMutation: () => ({ mutate: vi.fn() }) }, archive: { useMutation: () => ({ mutate: vi.fn() }) } },
} }))
describe('notifications load-more recovery', () => {
  it('keeps loaded rows visible on page failure and retries the failed cursor', () => {
    render(<Page />)
    expect(screen.getByText('First notice')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(mocks.fetchNextPage).toHaveBeenCalledOnce()
    expect(mocks.refetch).not.toHaveBeenCalled()
  })
})
