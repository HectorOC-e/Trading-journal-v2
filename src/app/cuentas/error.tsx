"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-sm text-[var(--loss)]">Error al cargar cuentas: {error.message}</p>
      <button
        onClick={reset}
        className="text-xs text-[var(--accent)] hover:underline"
      >
        Reintentar
      </button>
    </div>
  )
}
