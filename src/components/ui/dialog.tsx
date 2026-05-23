// Dialog — Radix primitive wrapped with spec tokens
// shadcn/ui pattern: copy-owned, no external stylesheet dependency

"use client"

import * as RadixDialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const Dialog        = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose   = RadixDialog.Close

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-h-[85vh] flex flex-col",
          "bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {/* Scrollable body — pr-10 leaves room for the fixed close button */}
        <div className="flex-1 overflow-y-auto p-6 pr-10">
          {children}
        </div>
        {/* Close button sits outside the scroll so it's always visible */}
        <RadixDialog.Close className="absolute right-3 top-3 z-10 p-1 rounded-sm text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors">
          <X size={16} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-[var(--ink)]", className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--ink-2)] mt-1", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[var(--line)]", className)}
      {...props}
    />
  )
}
