"use client"

import { useEffect } from "react"

export default function WelcomePolling({ isAlreadyActive }: { isAlreadyActive: boolean }) {
  useEffect(() => {
    if (isAlreadyActive) return

    let attempts = 0
    const MAX = 4

    function poll() {
      if (attempts >= MAX) return
      attempts++
      setTimeout(async () => {
        try {
          const res = await fetch("/api/payment-settings")
          const data = (await res.json()) as { isFoundingMember?: boolean }
          if (data?.isFoundingMember) {
            window.location.reload()
          } else {
            poll()
          }
        } catch {
          poll()
        }
      }, 1500)
    }

    poll()
  }, [isAlreadyActive])

  return null
}
