// Textarea atom — spec: Foundations > Atoms

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm resize-none",
        "bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)]",
        "placeholder:text-[var(--ink-3)] min-h-[80px]",
        "focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
}
