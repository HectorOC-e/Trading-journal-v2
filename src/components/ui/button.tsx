import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "rounded-[var(--radius-sm)] text-sm font-medium",
    "transition-all duration-150 cursor-pointer select-none",
    "disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] shadow-[var(--shadow-xs)]",
        ghost:   "bg-transparent border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)] hover:border-[var(--line-2)]",
        subtle:  "bg-[var(--chip)] text-[var(--ink-2)] hover:bg-[var(--line)] hover:text-[var(--ink)]",
        danger:  "bg-[var(--loss-soft)] text-[var(--loss)] border border-[var(--loss)]/40 hover:bg-[var(--loss)] hover:text-white",
        icon:    "bg-transparent text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]",
        link:    "bg-transparent text-[var(--accent)] hover:underline p-0 h-auto",
      },
      size: {
        xs:   "h-6 px-2.5 text-[11px] gap-1",
        sm:   "h-7 px-3 text-xs",
        md:   "h-8 px-3.5",
        lg:   "h-9 px-4 text-[13px]",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={12} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}
