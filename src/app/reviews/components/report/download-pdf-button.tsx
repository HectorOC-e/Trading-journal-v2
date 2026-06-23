"use client"

import { useState } from "react"
import { Printer } from "lucide-react"
import { toast } from "@/lib/use-toast"

/**
 * Downloads the review PDF via fetch → blob so a server failure surfaces as a
 * toast instead of navigating the browser to the route's JSON 500 ("error al
 * cargar la página"). Replaces the old plain <a href> link.
 */
export function DownloadPdfButton({ kind, period }: { kind: "weekly" | "monthly"; period: string }) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/pdf?type=${kind}&period=${period}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          body.error === "PDF_FAILED"
            ? "No se pudo generar el PDF. Inténtalo de nuevo en un momento."
            : body.error ?? `Error ${res.status}`,
        )
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `review-${kind}-${period}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo descargar el PDF.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
    >
      <Printer size={14} /> {loading ? "Generando…" : "Descargar PDF"}
    </button>
  )
}
