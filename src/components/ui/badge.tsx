import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default:  "bg-[var(--chip)] text-[var(--ink-2)]",
        win:      "bg-[var(--win-soft)] text-[var(--win)]",
        loss:     "bg-[var(--loss-soft)] text-[var(--loss)]",
        be:       "bg-[var(--be-soft)] text-[var(--be)]",
        accent:   "bg-[var(--accent-soft)] text-[var(--accent)]",
        aplus:    "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        offplan:  "bg-[var(--loss-soft)] text-[var(--loss)]",
        critica:  "bg-[var(--loss-soft)] text-[var(--loss)]",
        menor:    "bg-[var(--be-soft)] text-[var(--be)]",
        info:     "bg-[var(--accent-soft)] text-[var(--accent)]",
        review:   "bg-[var(--be-soft)] text-[var(--be)]",
        muted:    "bg-[var(--chip)] text-[var(--ink-3)] uppercase tracking-wide",
        success:  "bg-[var(--win-soft)] text-[var(--win)]",
        warning:  "bg-[var(--be-soft)] text-[var(--be)]",
        error:    "bg-[var(--loss-soft)] text-[var(--loss)]",
      },
      size: {
        sm: "px-1.5 py-px text-[10px]",
        md: "px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  )
}
