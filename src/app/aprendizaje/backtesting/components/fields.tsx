import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export const panel = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5"
export const selectClass = "block w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
export const textLink = "text-sm font-medium text-[var(--accent)] underline underline-offset-4"
export const sessionsPath = "/aprendizaje/backtesting"
export const pdfHref = (id: string, number: number) => `/api/backtesting/pdf?session=${id}&version=${number}`

export function Label({ text, children }: { text: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm"><span className="font-medium">{text}</span>{children}</label>
}

export function TextField({ label, value, onChange, type = "text", maxLength = 160, required = false, max }: {
  label: string; value: string; onChange: (value: string) => void; type?: "text" | "date"; maxLength?: number; required?: boolean; max?: string;
}) {
  return <Label text={label}><Input type={type} max={max} maxLength={maxLength} value={value} required={required} onChange={e => onChange(e.target.value)} /></Label>
}

export function NotesField({ label, value, onChange, maxLength = 3000, required = false }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; required?: boolean;
}) {
  return <Label text={label}><Textarea rows={2} maxLength={maxLength} value={value} required={required} onChange={e => onChange(e.target.value)} /></Label>
}
