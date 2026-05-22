// Button atom — spec: Foundations > Atoms

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] text-white hover:opacity-90",
        ghost:   "bg-transparent border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)]",
        danger:  "bg-[var(--loss-soft)] text-[var(--loss)] border border-[var(--loss)] hover:opacity-90",
        icon:    "bg-transparent text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]",
      },
      size: {
        sm:   "h-7 px-3 text-xs",
        md:   "h-9 px-4",
        lg:   "h-10 px-5",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
