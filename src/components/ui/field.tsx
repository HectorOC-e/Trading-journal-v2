import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Inline validation message shown under a field. Calm by default — small,
 * single line, with a subtle entrance so it never jolts the layout.
 * Renders nothing when there is no message (so it's safe to always mount).
 */
export function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className={cn(
        "field-error flex items-center gap-1 mt-1 text-[11px] leading-tight text-[var(--loss)]",
        className,
      )}
    >
      <AlertCircle size={11} className="shrink-0" />
      <span>{message}</span>
    </p>
  )
}

/**
 * Label + (optional) required marker + control + error, in the project's
 * eyebrow style. `label` and `children` are the only required pieces; pass
 * `htmlFor` for native inputs so the label is clickable.
 */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label != null && (
        <label htmlFor={htmlFor} className="text-eyebrow mb-1.5 flex items-center gap-1">
          {label}
          {required && (
            <span className="text-[var(--loss)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint != null && !error && (
        <p className="mt-1 text-[10px] leading-tight text-[var(--ink-3)]">{hint}</p>
      )}
      <FieldError message={error} />
    </div>
  )
}
