// Input atom — spec: Foundations > Atoms

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

export function Input({ className, mono, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm",
        "bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)]",
        "placeholder:text-[var(--ink-3)]",
        "focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]",
        "transition-colors",
        mono && "font-mono",
        className
      )}
      {...props}
    />
  )
}
