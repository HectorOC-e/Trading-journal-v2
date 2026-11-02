// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { ProfileClock } from "@/app/aprendizaje/components/profile-clock"

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-16T05:59:59Z")) })
afterEach(() => { cleanup(); vi.useRealTimers() })

it("ticks in 24-hour time, switches profile timezone and handles local midnight", () => {
  const { rerender } = render(<ProfileClock timezone="America/Tegucigalpa" />)
  expect(screen.getByText("23:59:59")).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByText("00:00:00")).toBeInTheDocument()
  rerender(<ProfileClock timezone="Asia/Tokyo" />)
  expect(screen.getByText("15:00:00")).toBeInTheDocument()
  expect(screen.getByText("Asia/Tokyo")).toBeInTheDocument()
})

it("uses UTC for invalid legacy timezone formatting and label", () => {
 render(<ProfileClock timezone="Invalid/Legacy" />)
 expect(screen.getByText("05:59:59")).toBeInTheDocument()
 expect(screen.getByText("UTC")).toBeInTheDocument()
 expect(screen.getByLabelText("Hora actual en UTC")).toBeInTheDocument()
})
