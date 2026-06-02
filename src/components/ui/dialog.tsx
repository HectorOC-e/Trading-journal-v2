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
  "aria-describedby": ariaDescribedBy,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        aria-describedby={ariaDescribedBy}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          // overflow:hidden on the outer shell — scrolling happens inside the body div
          "w-full max-h-[88vh] flex flex-col overflow-hidden",
          "bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {/* X button is ABOVE the scrollable div — always pinned to top-right */}
        <RadixDialog.Close className="absolute right-3 top-3 z-20 p-1.5 rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors">
          <X size={16} />
        </RadixDialog.Close>

        {/* Scrollable body — pr-10 so content doesn't hide behind the X */}
        <div className="flex-1 overflow-y-auto p-6 pr-10">
          {children}
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cn("text-base font-semibold text-[var(--ink)]", className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cn("text-sm text-[var(--ink-2)] mt-1", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[var(--line)]", className)}
      {...props}
    />
  )
}
