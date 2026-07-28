/**
 * @vitest-environment jsdom
 *
 * `byEmotion` NO puede estar vacío cuando la semana tiene trades: los que no
 * llevan emoción caen en el grupo "sin registro" (`analytics-bundle:229`), y
 * nada lo filtra. Así que condicionar los chips a `byEmotion.length === 0` los
 * volvía inalcanzables — hacían falta a la vez cero trades esa semana (para
 * vaciar byEmotion) y trades cerrados sin emoción esa semana (para llenar
 * pendingEmotion), que es imposible.
 *
 * El gesto se ofrece cuando HAY algo que rellenar, y punto.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PsychologyPanel } from "@/app/reviews/components/report/sections"

vi.mock("@/lib/trpc/client", () => ({
  trpc: { trades: { captureEmotion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}))

const money = (n: number) => `$${n.toFixed(0)}`

/** La forma REAL que llega de analytics-bundle en una semana con trades sin emoción. */
const CON_SIN_REGISTRO = [
  { emotion: "calm",         trades: 3, reconstructed: 0, winRate: 66, avgPnl: 150 },
  { emotion: "sin registro", trades: 2, reconstructed: 0, winRate: 50, avgPnl: -20 },
]

describe("PsychologyPanel — los chips tienen que ser alcanzables", () => {
  it("ofrece los chips aunque byEmotion traiga datos, que es el caso REAL", () => {
    render(<PsychologyPanel byEmotion={CON_SIN_REGISTRO} money={money}
      pendingEmotion={[{ id: "t1", symbol: "NQ", date: "2026-07-24" }]} />)
    expect(screen.getByRole("button", { name: "Ansioso" })).toBeInTheDocument()
    expect(screen.getByText(/NQ/)).toBeInTheDocument()
  })

  it("y sigue mostrando la tabla de emociones al mismo tiempo", () => {
    render(<PsychologyPanel byEmotion={CON_SIN_REGISTRO} money={money}
      pendingEmotion={[{ id: "t1", symbol: "NQ", date: "2026-07-24" }]} />)
    expect(screen.getByText(/calm/)).toBeInTheDocument()
    expect(screen.getByText(/sin registro/)).toBeInTheDocument()
  })

  it("sin pendientes no pinta ningún chip", () => {
    render(<PsychologyPanel byEmotion={CON_SIN_REGISTRO} money={money} pendingEmotion={[]} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("una semana sin trades ni pendientes lo dice, sin pedir un gesto imposible", () => {
    render(<PsychologyPanel byEmotion={[]} money={money} pendingEmotion={[]} />)
    expect(screen.getByText(/No registraste tu estado emocional/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
