"use client"

import { DynamicIcon, type IconName } from "lucide-react/dynamic"
import { useTagCatalog, resolveTagMeta, type TagMeta } from "@/lib/tags"

const SIZE = {
  sm: { pad: "px-1.5 py-0.5", text: "text-[10px]", icon: 11, dot: 6 },
  md: { pad: "px-2 py-0.5",   text: "text-[11px]", icon: 12, dot: 7 },
} as const

/** Presentational chip from already-resolved metadata (use inside lists). */
export function TagChipView({ meta, size = "md" }: { meta: TagMeta; size?: "sm" | "md" }) {
  const s = SIZE[size]
  const { color, icon, displayMode, name } = meta

  if (displayMode === "text") {
    return <span className={`inline-flex items-center font-semibold ${s.text}`} style={{ color }}>{name}</span>
  }
  if (displayMode === "dot") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium text-[var(--ink-2)] ${s.text}`}>
        <span className="rounded-full" style={{ width: s.dot, height: s.dot, background: color }} />
        {name}
      </span>
    )
  }
  // icon_color (default): tinted chip with optional icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${s.pad} ${s.text}`}
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {icon ? <DynamicIcon name={icon as IconName} size={s.icon} /> : null}
      {name}
    </span>
  )
}

/** Self-resolving chip (looks the name up in the catalog). */
export function TagChip({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const catalog = useTagCatalog()
  return <TagChipView meta={resolveTagMeta(name, catalog)} size={size} />
}
