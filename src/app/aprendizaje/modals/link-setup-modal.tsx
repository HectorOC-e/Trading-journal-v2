"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

export function LinkSetupModal({
  resource,
  open,
  onOpenChange,
}: {
  resource: ResourceFromDB | null
  open:     boolean
  onOpenChange: (v: boolean) => void
}) {
  const utils = trpc.useUtils()
  const { data: setups = [] } = trpc.setups.list.useQuery(undefined, { enabled: open })

  const linkSetup = trpc.learningResources.linkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })
  const unlinkSetup = trpc.learningResources.unlinkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  if (!resource) return null
  const linkedIds = new Set(resource.linkedSetups?.map((s) => s.id) ?? [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular a setup</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[var(--ink-3)] -mt-2">{resource.title}</p>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {setups.length === 0 && (
            <p className="text-sm text-[var(--ink-3)] py-4 text-center">No tienes setups creados.</p>
          )}
          {setups.map((s) => {
            const linked = linkedIds.has(s.id)
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (linked) {
                    unlinkSetup.mutate({ resourceId: resource.id, setupId: s.id })
                  } else {
                    linkSetup.mutate({ resourceId: resource.id, setupId: s.id })
                  }
                }}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm text-left transition-colors border",
                  linked
                    ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-[var(--panel-2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]"
                )}
              >
                <span>{s.name}</span>
                {linked && <Check size={12} />}
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
