"use client"

import { useEffect } from "react"

export default function LiveChat({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID
    if (!propertyId || !widgetId) {
      console.error(
        "[LiveChat] live_chat_enabled is ON but NEXT_PUBLIC_TAWK_PROPERTY_ID or " +
          "NEXT_PUBLIC_TAWK_WIDGET_ID is not set. Widget will not load."
      )
      return
    }

    // Guard against double-injection (React strict mode double-invokes effects)
    if (document.getElementById("tawk-to")) return

    // Must run post-hydration only — Tawk_API globals must exist before the script.
    // customStyle is read at script-load time; it must be set here, before the <script> appends.
    // yOffset 130: nav pill is 80px tall + 16px margin + up to 34px safe-area inset.
    ;(window as any).Tawk_API = (window as any).Tawk_API || {}
    ;(window as any).Tawk_API.customStyle = {
      visibility: {
        mobile: {
          position: "br",
          xOffset: 12,
          yOffset: 130,
        },
      },
    }
    ;(window as any).Tawk_LoadStart = new Date()

    const script = document.createElement("script")
    script.id = "tawk-to"
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    script.async = true
    script.charset = "UTF-8"
    script.setAttribute("crossorigin", "*")

    // body.appendChild — never insertBefore, which caused hydration crashes
    document.body.appendChild(script)

    return () => {
      // Tawk's documented teardown — removes the widget iframe and injected DOM nodes
      const api = (window as any).Tawk_API
      if (typeof api?.shutdown === "function") api.shutdown()
      document.getElementById("tawk-to")?.remove()
    }
  }, [enabled])

  return null
}
