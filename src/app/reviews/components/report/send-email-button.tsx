"use client"

import { Mail } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

type Period =
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }

/** Header action that emails the current review to the user. */
export function SendReviewEmailButton({ period }: { period: Period }) {
  const onSuccess = () => toast.success("Review enviada a tu correo")
  const onError = (e: unknown) => toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))

  const weeklyMut  = trpc.weeklyReviews.sendEmail.useMutation({ onSuccess, onError })
  const monthlyMut = trpc.monthlyReviews.sendEmail.useMutation({ onSuccess, onError })
  const pending = weeklyMut.isPending || monthlyMut.isPending

  const send = () => {
    if (period.kind === "weekly") weeklyMut.mutate({ weekStart: period.weekStart })
    else monthlyMut.mutate({ year: period.year, month: period.month })
  }

  return (
    <button
      onClick={send}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] disabled:opacity-60"
    >
      <Mail size={14} /> {pending ? "Enviando…" : "Enviar por correo"}
    </button>
  )
}
