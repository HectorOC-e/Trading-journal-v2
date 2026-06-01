interface MiniSparklineProps {
  data: number[]
  positive: boolean
  width?: number
  height?: number
}

export function MiniSparkline({ data, positive, width = 120, height = 36 }: MiniSparklineProps) {
  const W = width, H = height
  const max = Math.max(...data), min = Math.min(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 4 - ((v - min) / rng) * (H - 8),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = line + ` L${W},${H} L0,${H} Z`
  const color = positive ? "var(--win)" : "var(--loss)"
  const id = `sp-${positive ? "w" : "l"}-${Math.random().toString(36).slice(2, 6)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
