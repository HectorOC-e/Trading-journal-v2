import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-[var(--radius-sm)] text-[13px] resize-y",
        "bg-[var(--panel-2)] border text-[var(--ink)]",
        "placeholder:text-[var(--ink-3)] min-h-[80px]",
        "transition-colors duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        error
          ? "border-[var(--loss)] focus:ring-[var(--loss)]/30"
          : "border-[var(--line)] hover:border-[var(--line-2)]",
        className
      )}
      {...props}
    />
  )
}
