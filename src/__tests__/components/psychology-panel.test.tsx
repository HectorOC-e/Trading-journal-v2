/**
 * @vitest-environment jsdom
 * La rama vacía de PsychologyPanel PEDÍA el gesto con una frase que no llevaba
 * a ninguna parte: cuando el trader la leía, los trades de la semana ya estaban
 * cerrados y el nudge del cierre había desaparecido para siempre.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PsychologyPanel } from "@/app/reviews/components/report/sections"

vi.mock("@/lib/trpc/client", () => ({
  trpc: { trades: { captureEmotion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}))

const money = (n: number) => `$${n.toFixed(0)}`

describe("PsychologyPanel", () => {
  it("sin emoción y con pendientes ofrece los chips en vez de la frase muerta", () => {
    render(<PsychologyPanel byEmotion={[]} money={money}
      pendingEmotion={[{ id: "t1", symbol: "NQ", date: "2026-07-24" }]} />)
    expect(screen.queryByText(/Registra tu estado emocional en los trades para ver este análisis/)).not.toBeInTheDocument()
    expect(screen.getByText(/NQ/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ansioso" })).toBeInTheDocument()
  })

  it("sin emoción y sin pendientes explica por qué no hay nada que hacer", () => {
    render(<PsychologyPanel byEmotion={[]} money={money} pendingEmotion={[]} />)
    expect(screen.getByText(/No registraste tu estado emocional/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("declara cuántas de cada emoción son reconstruidas", () => {
    render(<PsychologyPanel money={money} pendingEmotion={[]}
      byEmotion={[{ emotion: "calm", trades: 8, reconstructed: 2, winRate: 62, avgPnl: 120 }]} />)
    expect(screen.getByText(/2 reconstruidas/)).toBeInTheDocument()
  })

  it("no inventa la etiqueta cuando no hay ninguna reconstruida", () => {
    render(<PsychologyPanel money={money} pendingEmotion={[]}
      byEmotion={[{ emotion: "calm", trades: 8, reconstructed: 0, winRate: 62, avgPnl: 120 }]} />)
    expect(screen.queryByText(/reconstruidas/)).not.toBeInTheDocument()
  })
})
