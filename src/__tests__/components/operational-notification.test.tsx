// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { NotificationItem } from "@/components/notifications/notification-item"
import type { AppNotification } from "@/lib/notifications"

afterEach(cleanup)
const base: AppNotification = { id: "n", code: "INSIGHT_DETECTED", type: "INFO", priority: "P3", category: "Sistema", title: "Patrón", body: "", href: "/analytics", params: {}, actions: [], channel: "in_app", sourceId: null, groupKey: null, dedupeKey: null, readAt: null, archivedAt: null, createdAt: new Date() }

it.each([["REAL", "Real"], ["DEMO", "Demo"], ["BACKTEST", "Backtesting"]])("labels %s in the shared inbox", (mode, label) => {
  render(<NotificationItem n={{ ...base, params: { mode } }} onMarkRead={vi.fn()} onArchive={vi.fn()} />)
  expect(screen.getByText(label)).toBeTruthy()
})

it("labels legacy operational notifications as history without asserting Real", () => {
  render(<NotificationItem n={base} onMarkRead={vi.fn()} onArchive={vi.fn()} />)
  expect(screen.getByText("Histórica · modalidad sin verificar")).toBeTruthy()
  expect(screen.queryByText("Real")).toBeNull()
})
