interface MiniSparklineProps {
  data:      number[]
  positive:  boolean
  width?:    number
  height?:   number
  strokeWidth?: number
}

export function MiniSparkline({ data, positive, width = 120, height = 40, strokeWidth = 1.5 }: MiniSparklineProps) {
  const W = width, H = height
  const max = Math.max(...data), min = Math.min(...data)
  const rng = max - min || 1
  const pad = 4
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (W - pad * 2) + pad,
    y: H - pad - ((v - min) / rng) * (H - pad * 2),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${line} L${W - pad},${H} L${pad},${H} Z`
  const color = positive ? "var(--win)" : "var(--loss)"
  const id = `sp-${positive ? "w" : "l"}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.14} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last data point dot */}
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r={2}
          fill={color}
        />
      )}
    </svg>
  )
}
