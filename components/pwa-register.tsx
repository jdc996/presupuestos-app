"use client"

import { useEffect } from "react"

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    const swUrl = "/sw.js"
    ;(async () => {
      try {
        await navigator.serviceWorker.register(swUrl, { scope: "/" })
      } catch {
        // noop
      }
    })()

    // Optional: listen for controllerchange to refresh when a new SW takes control
    const onControllerChange = () => {
      // avoid reload loops
      if ((window as any)._reloaded) return
      ;(window as any)._reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
  }, [])

  return null
}


