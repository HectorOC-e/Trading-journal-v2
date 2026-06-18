import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, mono, error, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        "w-full h-8 px-3 rounded-[var(--radius-sm)] text-[13px]",
        "bg-[var(--panel-2)] border text-[var(--ink)]",
        "placeholder:text-[var(--ink-3)]",
        "transition-colors duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        error
          ? "border-[var(--loss)] focus:ring-[var(--loss)]/30 focus:border-[var(--loss)]"
          : "border-[var(--line)] hover:border-[var(--line-2)]",
        mono && "font-mono text-[12px] tracking-tight",
        className
      )}
      {...props}
    />
  )
})
