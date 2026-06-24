"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./dialog"
import { Button } from "./button"

/**
 * Small themed confirmation dialog — a pretty replacement for window.confirm().
 * Controlled via `open` / `onOpenChange`. Defaults to a destructive (red) action.
 */
export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = "Eliminar", cancelLabel = "Cancelar",
  onConfirm, loading = false, destructive = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  loading?: boolean
  destructive?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">{cancelLabel}</Button>
          </DialogClose>
          <Button variant={destructive ? "danger" : "primary"} size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
