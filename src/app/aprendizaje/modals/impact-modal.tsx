"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

export function SetupImpactModal({
  resource,
  open,
  onOpenChange,
}: {
  resource: ResourceFromDB | null
  open:     boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: impact = [], isLoading } = trpc.learningResources.setupImpact.useQuery(
    resource?.id ?? "",
    { enabled: open && !!resource }
  )

  if (!resource) return null

  const noCompletedAt = !resource.completedAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>📊 Impacto en trading</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[var(--ink-3)] -mt-2 truncate">{resource.title}</p>

        {noCompletedAt ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">
              Completa este recurso para empezar a medir su impacto en los setups vinculados.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">Calculando…</p>
          </div>
        ) : impact.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">Sin setups vinculados o sin trades para medir.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-[var(--ink-3)]">
              Desde{" "}
              {new Date(impact[0].completedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {impact.map((item) => (
              <div
                key={item.setupId}
                className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] px-3 py-2.5"
              >
                <span className="text-sm font-medium text-[var(--ink)]">{item.setupName}</span>
                <div className="text-right">
                  {item.totalTrades < 5 ? (
                    <div>
                      <p className="text-xs font-mono text-[var(--ink-2)]">{item.totalTrades} trade{item.totalTrades !== 1 ? "s" : ""}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">Pocos datos (≥5)</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-mono font-bold" style={{ color: (item.winRate ?? 0) >= 50 ? "var(--win)" : "var(--loss)" }}>
                        {item.winRate}% WR
                      </p>
                      <p className="text-[10px] text-[var(--ink-3)]">{item.wins}/{item.totalTrades} trades</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
