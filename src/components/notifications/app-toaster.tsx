"use client"

import { Toaster } from "sonner"
import { useViewportWidth } from "@/hooks/useViewportWidth"

/** Sonner Toaster anchored bottom-center on mobile (thumb zone), bottom-right on desktop. */
export function AppToaster() {
  const width = useViewportWidth()
  const isMobile = width != null && width < 768
  return (
    <Toaster
      position={isMobile ? "bottom-center" : "bottom-right"}
      gap={10}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
    />
  )
}
