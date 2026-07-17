/**
 * @vitest-environment jsdom
 * S2/OI-2 — the close form asks for the entry emotion inline.
 *
 * It used to render a nudge saying "añádelo al editarlo": it asked for the signal
 * and then sent the trader somewhere else to give it, which is how the signal got
 * lost. These tests pin the two things that make the fix real — the chips are in
 * the nudge, and tapping one carries the emotion into the close payload — plus the
 * case that must NOT nag: a trade that already has its emotion.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { TradeDetailPanel } from "@/components/trades/trade-detail-panel"

const OPEN_TRADE = {
  id: "t1",
  symbol: "MNQ",
  direction: "LONG" as const,
  session: "New York",
  date: "2026-07-16",
  openTime: "09:30",
  entry: 21000,
  stop: 20900,
  target: 21200,
  size: 1,
  pnl: null,
  rMultiple: null,
  tags: [] as string[],
  notes: "",
  screenshotUrls: [] as string[],
  status: "OPEN",
  emotionBefore: null,
}

// The panel is presentational here; render it as the trades page does.
function renderPanel(overrides: Record<string, unknown> = {}, onCloseTrade = vi.fn()) {
  render(
    <TradeDetailPanel
      trade={{ ...OPEN_TRADE, ...overrides } as never}
      onCloseTrade={onCloseTrade}
    />
  )
  return onCloseTrade
}

/** The close form lives behind a disclosure; open it. */
function openCloseForm() {
  fireEvent.click(screen.getByText(/Cerrar trade/i))
}

describe("close form — entry emotion capture (S2/OI-2)", () => {
  it("offers the emotion chips when the trade has no recorded emotion", () => {
    renderPanel()
    openCloseForm()

    expect(screen.getByText(/¿Cómo entraste a este trade\?/i)).toBeInTheDocument()
    // The catalog, rendered as one-tap chips rather than a pointer elsewhere.
    expect(screen.getByRole("button", { name: "Ansioso" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tranquilo" })).toBeInTheDocument()
  })

  it("no longer tells the trader to go and edit the trade", () => {
    renderPanel()
    openCloseForm()
    expect(screen.queryByText(/al editarlo/i)).not.toBeInTheDocument()
  })

  it("does not nag when the emotion was already recorded at open", () => {
    renderPanel({ emotionBefore: "calm" })
    openCloseForm()
    expect(screen.queryByText(/¿Cómo entraste a este trade\?/i)).not.toBeInTheDocument()
  })

  it("carries the tapped emotion into the close payload", () => {
    const onCloseTrade = renderPanel()
    openCloseForm()

    fireEvent.click(screen.getByRole("button", { name: "Ansioso" }))
    fireEvent.change(screen.getByLabelText(/Precio de cierre/i), { target: { value: "21100" } })
    fireEvent.click(screen.getByRole("button", { name: /Confirmar cierre/i }))

    expect(onCloseTrade).toHaveBeenCalledWith(
      expect.objectContaining({ emotionBefore: "anxious", closePrice: 21100 })
    )
  })
})
