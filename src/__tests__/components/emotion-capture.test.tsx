/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmotionCapture } from "@/components/trades/emotion-capture"

vi.mock("@/lib/trpc/client", () => ({
  trpc: { trades: { captureEmotion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}))

describe("EmotionCapture", () => {
  it("dentro de ventana ofrece los cinco chips", () => {
    render(<EmotionCapture tradeId="t1" current={null} withinWindow />)
    for (const label of ["Tranquilo", "Ansioso", "Eufórico", "Temeroso", "Sobreconfiado"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
    }
  })

  it("fuera de ventana y sin emoción no pinta nada", () => {
    const { container } = render(<EmotionCapture tradeId="t1" current={null} withinWindow={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("fuera de ventana con emoción muestra el valor sin chips", () => {
    render(<EmotionCapture tradeId="t1" current="anxious" withinWindow={false} />)
    expect(screen.getByText("Ansioso")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
