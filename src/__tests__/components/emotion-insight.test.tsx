/**
 * @vitest-environment jsdom
 * EmotionInsight — the in-the-moment incentive (DELTA D10). Presentational: given
 * the trader's history for the captured emotion, it states what that emotion has
 * meant. Renders nothing when there is no (sufficient) history.
 */
import { render, screen } from "@testing-library/react"
import { EmotionInsight } from "@/components/trades/emotion-insight"

describe("EmotionInsight", () => {
  it("shows the historical win rate and sample for the emotion", () => {
    render(<EmotionInsight feedback={{ emotion: "anxious", n: 6, winRate: 33.3, avgR: -0.4 }} />)
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/6/)).toBeInTheDocument()
  })

  it("renders nothing when there is no feedback (insufficient sample)", () => {
    const { container } = render(<EmotionInsight feedback={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})