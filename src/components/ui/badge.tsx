// Badge atom — spec: Foundations > Atoms
// Variants derived from design-spec/foundations.html anatomy card

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
  {
    variants: {
      variant: {
        default:    "bg-[var(--chip)] text-[var(--ink-2)]",
        win:        "bg-[var(--win-soft)] text-[var(--win)]",
        loss:       "bg-[var(--loss-soft)] text-[var(--loss)]",
        be:         "bg-[var(--be-soft)] text-[var(--be)]",
        accent:     "bg-[var(--accent-soft)] text-[var(--accent)]",
        aplus:      "bg-[var(--win-soft)] text-[var(--win)]",
        offplan:    "bg-[var(--loss-soft)] text-[var(--loss)]",
        critica:    "bg-[var(--loss-soft)] text-[var(--loss)]",
        menor:      "bg-[var(--be-soft)] text-[var(--be)]",
        info:       "bg-[var(--accent-soft)] text-[var(--accent)]",
        review:     "bg-[var(--be-soft)] text-[var(--be)]",
        auto:       "bg-[var(--chip)] text-[var(--ink-3)] uppercase tracking-wide",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
}
