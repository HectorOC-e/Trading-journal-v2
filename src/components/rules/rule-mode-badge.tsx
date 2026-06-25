// RuleModeBadge — enforce/warn indicator for the unified Rule model (C6, S1).
// DESIGN_SYSTEM_V3 §5: color is never the only carrier of meaning — each mode
// has a distinct label ("Bloquea" / "Avisa") and an aria-label for assistive tech.

import { Badge } from "@/components/ui/badge"
import type { RuleMode } from "@/domains/rules/unification"

const COPY: Record<RuleMode, { label: string; variant: "error" | "warning"; title: string }> = {
  enforce: { label: "Bloquea", variant: "error", title: "Esta regla bloquea la operación" },
  warn: { label: "Avisa", variant: "warning", title: "Esta regla solo avisa, no bloquea" },
}

export function RuleModeBadge({ mode, className }: { mode: RuleMode; className?: string }) {
  const c = COPY[mode]
  return (
    <Badge variant={c.variant} size="sm" className={className} aria-label={c.title} title={c.title}>
      {c.label}
    </Badge>
  )
}
