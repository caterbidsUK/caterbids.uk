"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type SocialProvider = "google" | "apple" | "facebook"

type SocialLoginButtonsProps = {
  next?: string
  className?: string
  providers?: SocialProvider[]
}

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  facebook: "Continue with Facebook",
}

function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account"
  return value
}

function appOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin
    const currentHost = window.location.hostname
    const configuredHost = configuredOrigin ? new URL(configuredOrigin).hostname : ""

    if (
      configuredOrigin &&
      configuredHost !== "localhost" &&
      configuredHost !== "127.0.0.1"
    ) {
      return configuredOrigin
    }

    if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      return currentOrigin
    }

    return configuredOrigin || currentOrigin
  }
  if (configuredOrigin) return configuredOrigin
  return "http://localhost:3000"
}

function callbackUrl(origin: string, next: string) {
  if (next === "/account") return `${origin}/auth/callback`
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

export default function SocialLoginButtons({
  next,
  className = "",
  // Additional providers should be passed explicitly only after their OAuth
  // credentials and callback flow have been verified for launch.
  providers = ["google"],
}: SocialLoginButtonsProps) {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | "">("")
  const [error, setError] = useState("")
  const redirectNext = safeNextPath(
    next || searchParams.get("next") || searchParams.get("redirect") || searchParams.get("returnUrl")
  )

  async function loginWithProvider(provider: SocialProvider) {
    setError("")
    setLoadingProvider(provider)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl(appOrigin(), redirectNext),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      })

      if (authError) setError(authError.message)
    } catch (authError) {
      setError(
        authError instanceof Error && authError.message.toLowerCase().includes("load failed")
          ? "Could not reach the authentication service. Check your internet connection, then try again."
          : "Social sign in is temporarily unavailable. Please try again."
      )
    } finally {
      setLoadingProvider("")
    }
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => loginWithProvider(provider)}
          disabled={Boolean(loadingProvider)}
          className={[
            "flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-base font-black shadow-sm transition disabled:cursor-wait disabled:opacity-60",
            provider === "apple"
              ? "bg-black text-white hover:bg-zinc-900"
              : "border border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/40",
          ].join(" ")}
        >
          <span
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-sm font-black",
              provider === "apple"
                ? "bg-white text-black"
                : provider === "facebook"
                  ? "border border-blue-100 bg-blue-50 text-blue-700"
                  : "border border-slate-200 text-[#FF6B00]",
            ].join(" ")}
          >
            {provider === "apple" ? "" : provider === "facebook" ? "f" : "G"}
          </span>
          {loadingProvider === provider ? `Opening ${provider}...` : PROVIDER_LABELS[provider]}
        </button>
      ))}
    </div>
  )
}
