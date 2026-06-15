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
      <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]" />
      <RadixDialog.Content
        aria-describedby={ariaDescribedBy}
        className={cn(
          "dialog-content",
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-h-[90dvh] flex flex-col overflow-hidden",
          "bg-[var(--panel)] rounded-[var(--radius-lg)]",
          "shadow-[var(--shadow-lg)]",
          className
        )}
        {...props}
      >
        {/* Close button — pinned top-right */}
        <RadixDialog.Close
          className="absolute right-3 top-3 z-20 p-1.5 rounded-[var(--radius-xs)] text-[var(--ink-3)] transition-[color,background-color,transform] duration-150 hover:bg-[var(--chip)] hover:text-[var(--ink)] active:scale-95"
          aria-label="Cerrar"
        >
          <X size={15} />
        </RadixDialog.Close>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 pr-10">
          {children}
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-5", className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn("text-[15px] font-semibold text-[var(--ink)] leading-tight", className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return (
    <RadixDialog.Description
      className={cn("text-[13px] text-[var(--ink-3)] mt-1 leading-relaxed", className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 mt-5 pt-4",
        "border-t border-[var(--line)]",
        className
      )}
      {...props}
    />
  )
}
