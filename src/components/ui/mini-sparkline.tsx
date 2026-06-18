"use client"

import { useRef, useState } from "react"

interface MiniSparklineProps {
  data:      number[]
  positive:  boolean
  width?:    number
  height?:   number
  strokeWidth?: number
  /** Formats the value shown in the hover tooltip (e.g. currency). */
  format?:   (v: number) => string
  /** Disable hover crosshair/tooltip (e.g. decorative use). Default: on. */
  interactive?: boolean
}

export function MiniSparkline({
  data, positive, width = 120, height = 40, strokeWidth = 1.5,
  format, interactive = true,
}: MiniSparklineProps) {
  const W = width, H = height
  const max = Math.max(...data), min = Math.min(...data)
  const rng = max - min || 1
  const pad = 4
  const n = data.length
  const pts = data.map((v, i) => ({
    x: (i / (n - 1 || 1)) * (W - pad * 2) + pad,
    y: H - pad - ((v - min) / rng) * (H - pad * 2),
    v,
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${line} L${W - pad},${H} L${pad},${H} Z`
  const color = positive ? "var(--win)" : "var(--loss)"
  const id = `sp-${positive ? "w" : "l"}`
  const flat = max === min // no movement → "sin trades": render a quiet baseline

  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState<number | null>(null)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || n < 2) return
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setIdx(Math.round(ratio * (n - 1)))
  }

  const active = idx != null ? pts[idx] : null
  const last   = pts[pts.length - 1]
  const pct = (p: { x: number; y: number }) => ({ x: (p.x / W) * 100, y: (p.y / H) * 100 })
  const lastP = pct(last)
  const tipX  = active ? Math.min(88, Math.max(12, pct(active).x)) : 0
  const delta = active && idx! > 0 ? active.v - pts[0].v : null

  return (
    <div
      ref={ref}
      className="relative"
      data-sparkline
      style={{ height: H, touchAction: "pan-y" }}
      onPointerMove={interactive && !flat ? onMove : undefined}
      onPointerDown={interactive && !flat ? onMove : undefined}
      onPointerLeave={interactive ? () => setIdx(null) : undefined}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: H, display: "block" }}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.14} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {!flat && <path d={area} fill={`url(#${id})`} />}
        <path
          d={line}
          fill="none"
          stroke={flat ? "var(--line-2)" : color}
          strokeWidth={strokeWidth}
          strokeDasharray={flat ? "3 3" : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* "Today" marker — the last point, always visible (HTML keeps it a true circle) */}
      {!flat && (
        <span
          className="spark-today"
          style={{ left: `${lastP.x}%`, top: `${lastP.y}%`, ["--spark-color" as string]: color }}
        />
      )}

      {/* Hover crosshair + dot + tooltip */}
      {active && (
        <>
          <span className="spark-crosshair" style={{ left: `${pct(active).x}%` }} />
          <span
            className="spark-dot"
            style={{ left: `${pct(active).x}%`, top: `${pct(active).y}%`, ["--spark-color" as string]: color }}
          />
          <div className="spark-tip" style={{ left: `${tipX}%` }}>
            <span className="font-mono font-semibold">{format ? format(active.v) : active.v.toFixed(0)}</span>
            {delta != null && (
              <span className="font-mono" style={{ color: delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                {delta >= 0 ? "▲" : "▼"} {format ? format(Math.abs(delta)) : Math.abs(delta).toFixed(0)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
