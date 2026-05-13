"use client"

import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export default function SocialLoginButtons() {
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const next = searchParams.get("next") || searchParams.get("redirect") || "/account"

  async function loginWithProvider(provider: "google" | "apple") {
    const supabase = createClient()
    const origin = window.location.origin

    setError("")

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (authError) {
        setError(authError.message)
      }
    } catch (authError) {
      setError(
        authError instanceof Error && authError.message.toLowerCase().includes("load failed")
          ? "Could not reach the authentication service. Check your internet connection, then try again."
          : "Social sign in is temporarily unavailable. Please try again."
      )
    }
  }

  return (
    <div className="grid gap-3">
      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => loginWithProvider("google")}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-[#001633] shadow-sm transition hover:bg-white/90"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => loginWithProvider("apple")}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-zinc-900"
      >
        Continue with Apple
      </button>
    </div>
  )
}
