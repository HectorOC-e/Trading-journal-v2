"use client"

import { useEffect } from "react"

/** Registers the PWA service worker once on the client, after hydration. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}
