"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

type AuthProvider = "google" | "email" | "password" | "reset" | "resend" | "otp" | "verify-otp"

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account"
  }

  return value
}

function authRedirectUrl(origin: string, nextPath: string) {
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
}

function appOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (typeof window !== "undefined") {
    const currentOrigin =
      window.location.hostname === "0.0.0.0"
        ? window.location.origin.replace("0.0.0.0", "localhost")
        : window.location.origin
    const currentHost = window.location.hostname
    const configuredHost = configuredOrigin ? new URL(configuredOrigin).hostname : ""
    const isCurrentLocal =
      currentHost === "localhost" ||
      currentHost === "127.0.0.1" ||
      currentHost === "0.0.0.0" ||
      currentHost.endsWith(".local") ||
      /^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|^192\.168\./.test(currentHost)

    if (isCurrentLocal) {
      return currentOrigin
    }

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

function authErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.toLowerCase().includes("load failed")) {
      return "Could not reach the authentication service. Check your internet connection, then try again."
    }
    return error.message
  }

  return "Authentication is temporarily unavailable. Please try again."
}

function passwordAuthErrorMessage(error: unknown, mode: "signin" | "signup") {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error || "")
  const lower = message.toLowerCase()

  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Please confirm your email before logging in."
  }
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Invalid email or password."
  }
  if (lower.includes("rate") || lower.includes("too many") || lower.includes("security purposes")) {
    return "Too many attempts, please wait."
  }
  if (mode === "signup" && (lower.includes("already registered") || lower.includes("already exists"))) {
    return "An account already exists for this email. Log in instead."
  }

  return message || (mode === "signin" ? "Could not log in. Please try again." : "Could not create your account. Please try again.")
}

function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (!password) return { score: 0, label: "Add a password" }
  if (score <= 1) return { score, label: "Weak" }
  if (score <= 3) return { score, label: "Good" }
  return { score, label: "Strong" }
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const next = safeNextPath(searchParams.get("next") || searchParams.get("redirect") || searchParams.get("returnUrl"))
  const callbackError = searchParams.get("error")
  const isLocalDev = process.env.NODE_ENV === "development"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordMode, setPasswordMode] = useState<"signin" | "signup">("signin")
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [showOtpPanel, setShowOtpPanel] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | "">("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [lastSignupEmail, setLastSignupEmail] = useState("")

  const strength = passwordStrength(password)
  const redirectTo = useMemo(() => {
    return authRedirectUrl(appOrigin(), next)
  }, [next])
  const oauthRedirectTo = useMemo(() => {
    return authRedirectUrl(appOrigin(), next)
  }, [next])

  useEffect(() => {
    async function redirectSignedInUser() {
      const user = await getCurrentUser(supabase)
      if (user) router.push(next)
    }

    redirectSignedInUser()
  }, [router, next, supabase])

  async function syncProfile(provider: AuthProvider) {
    await fetch("/api/auth/sync-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }).catch(() => null)
  }

  async function loginWithGoogle() {
    setError("")
    setNotice("")
    setLoadingProvider("google")

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectTo,
          queryParams: { prompt: "select_account" },
          skipBrowserRedirect: true,
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.url) {
        window.location.assign(data.url)
        return
      }

      setError("Google sign in could not start. Please try again.")
    } catch (authError) {
      setError(authErrorMessage(authError))
    } finally {
      setLoadingProvider("")
    }
  }

  function openPasswordPanel(mode: "signin" | "signup") {
    setPasswordMode(mode)
    setShowPasswordPanel(true)
    setShowOtpPanel(false)
    setError("")
    setNotice("")
  }

  function openOtpPanel() {
    setShowOtpPanel(true)
    setShowPasswordPanel(false)
    setError("")
    setNotice("")
  }

  async function sendEmailOtp(event?: React.FormEvent) {
    event?.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Add your email address.")
      return
    }

    setError("")
    setNotice("")
    setOtpCode("")
    setLoadingProvider("otp")

    try {
      const response = await fetch("/api/auth/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          next,
          redirectTo,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload.error || "Could not send your login code. Please try again.")
        return
      }

      setLastSignupEmail(trimmedEmail)
      setNotice(payload.message || "Check your email for your CaterBidsUK login code.")
    } catch (otpError) {
      setError(authErrorMessage(otpError))
    } finally {
      setLoadingProvider("")
    }
  }

  async function verifyEmailOtp(event: React.FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    const token = otpCode.replace(/\s+/g, "")

    if (!trimmedEmail || !token) {
      setError("Add your email and the login code from your email.")
      return
    }

    setError("")
    setNotice("")
    setLoadingProvider("verify-otp")

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "email",
      })

      console.log("[verifyEmailOtp] result:", {
        ok: !verifyError,
        hasSession: Boolean(data?.session),
        error: verifyError?.message ?? null,
      })

      if (verifyError) {
        setError(verifyError.message || "The login code was not accepted.")
        return
      }

      if (!data.session) {
        setError("The login code was accepted, but the session could not start. Please try again.")
        return
      }

      await syncProfile("email")
      router.push(next)
      router.refresh()
    } catch (verifyError) {
      setError(authErrorMessage(verifyError))
    } finally {
      setLoadingProvider("")
    }
  }

  async function passwordAuth(event: React.FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setError("Add your email and password.")
      return
    }
    if (passwordMode === "signup" && password.length < 10) {
      setError("Password must be at least 10 characters.")
      return
    }

    setError("")
    setNotice("")
    setLastSignupEmail("")
    setLoadingProvider("password")

    try {
      const result = passwordMode === "signin"
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: { emailRedirectTo: redirectTo },
          })

      if (result.error) {
        setError(passwordAuthErrorMessage(result.error, passwordMode))
        return
      }

      if (result.data.session) {
        await syncProfile("password")
        router.push(next)
        router.refresh()
        return
      }

      setLastSignupEmail(trimmedEmail)
      setNotice("Account created. Please check your email and confirm your address, then log in. If it does not arrive, use resend below.")
    } catch (passwordError) {
      setError(passwordAuthErrorMessage(passwordError, passwordMode))
    } finally {
      setLoadingProvider("")
    }
  }

  async function resendSignupConfirmation(targetEmail = lastSignupEmail || email) {
    const trimmedEmail = targetEmail.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Add the email address you used to sign up.")
      return
    }

    setError("")
    setNotice("")
    setLoadingProvider("resend")

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          next,
          redirectTo,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload.error || "Could not resend the confirmation email.")
        return
      }

      setLastSignupEmail(trimmedEmail)
      setNotice(payload.message || "Confirmation email sent again. Please check your inbox and spam folder.")
    } catch (resendError) {
      setError(authErrorMessage(resendError))
    } finally {
      setLoadingProvider("")
    }
  }

  async function sendPasswordReset() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Add your email address first.")
      return
    }

    setError("")
    setNotice("")
    setLoadingProvider("reset")

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: authRedirectUrl(appOrigin(), "/reset-password"),
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setNotice("Check your email for a secure CaterBidsUK password reset link.")
    } catch (resetError) {
      setError(authErrorMessage(resetError))
    } finally {
      setLoadingProvider("")
    }
  }

  return (
    <main className="min-h-screen bg-[#002E5D] px-4 py-6 text-[#002E5D]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <section className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-black/25">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </h1>
            <h2 className="mt-5 text-2xl font-black">Welcome to CaterBidsUK</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">The UK Marketplace for Catering Equipment</p>
            <p className="mt-2 text-xs font-black tracking-[0.22em] text-[#FF6B00]">BUY • SELL • SAVE</p>
          </div>

          {callbackError && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              Sign in could not be completed. Please try again.
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
              <p>{notice}</p>
              {lastSignupEmail && !showOtpPanel && (
                <button
                  type="button"
                  onClick={() => resendSignupConfirmation(lastSignupEmail)}
                  disabled={loadingProvider === "resend"}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-black text-green-800 shadow-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingProvider === "resend" ? "Sending..." : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={Boolean(loadingProvider)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-black text-[#002E5D] shadow-sm transition hover:border-[#FF6B00]/40 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-[#FF6B00]">G</span>
              {loadingProvider === "google" ? "Opening Google..." : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={openOtpPanel}
              disabled={Boolean(loadingProvider)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-4 py-3 text-base font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:opacity-60"
            >
              <Mail size={20} />
              Sign up with Email Code
            </button>

            <button
              type="button"
              onClick={() => openPasswordPanel("signin")}
              disabled={Boolean(loadingProvider)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#002E5D]/15 bg-white px-4 py-3 text-base font-black text-[#002E5D] shadow-sm transition hover:border-[#FF6B00]/40 disabled:opacity-60"
            >
              <Lock size={18} />
              Login with Email
            </button>
          </div>

          <p className="mt-4 text-center text-sm font-semibold text-slate-500">
            Sign up or log in with a secure email code. Password login remains available for existing accounts.
          </p>

          {showOtpPanel && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={lastSignupEmail ? verifyEmailOtp : sendEmailOtp} className="space-y-3 border-t border-slate-100 p-4">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
                  Enter your email and we&apos;ll send a secure login code.
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setLastSignupEmail("")
                    setOtpCode("")
                  }}
                  placeholder="Email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                  required
                />
                {lastSignupEmail && (
                  <input
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                    placeholder="Enter login code"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold tracking-[0.2em] outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                    required
                  />
                )}
                <button
                  type="submit"
                  disabled={loadingProvider === "otp" || loadingProvider === "verify-otp"}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#002E5D] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingProvider === "otp" || loadingProvider === "verify-otp" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  {lastSignupEmail ? "Verify login code" : "Email me a login code"}
                </button>
                {lastSignupEmail && (
                  <button
                    type="button"
                    onClick={() => sendEmailOtp()}
                    disabled={loadingProvider === "otp"}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#002E5D] disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingProvider === "otp" ? "Sending..." : "Send a new code"}
                  </button>
                )}
              </form>
            </div>
          )}

          {showPasswordPanel && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={passwordAuth} className="space-y-3 border-t border-slate-100 p-4">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
                  Existing password account? Sign in here. New accounts should use the email code button above.
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={passwordMode === "signin" ? "Your password" : "Password, 10+ characters"}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-bold outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                    minLength={passwordMode === "signup" ? 10 : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordMode === "signup" ? (
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#FF6B00] transition-all"
                        style={{ width: `${Math.max(8, strength.score * 25)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">Password strength: {strength.label}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-500">
                      Use the password already saved on your CaterBidsUK account.
                    </p>
                    <button
                      type="button"
                      onClick={sendPasswordReset}
                      disabled={loadingProvider === "reset"}
                      className="mt-2 text-xs font-black text-[#FF6B00] underline disabled:cursor-wait disabled:opacity-60"
                    >
                      {loadingProvider === "reset" ? "Sending reset link..." : "Forgot password? Send reset link"}
                    </button>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loadingProvider === "password"}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#002E5D] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingProvider === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={16} />}
                  {passwordMode === "signin" ? "Sign in with password" : "Create password account"}
                </button>
              </form>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>We only use your login information to create and protect your CaterBidsUK account.</p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to CaterBidsUK’s{" "}
            <Link href="/terms" className="font-black text-[#002E5D] underline">Terms</Link>,{" "}
            <Link href="/privacy-policy" className="font-black text-[#002E5D] underline">Privacy Policy</Link> and{" "}
            <Link href="/legal/cookies" className="font-black text-[#002E5D] underline">Cookie Policy</Link>.
          </p>

          {isLocalDev && (
            <Link
              href={`/api/dev-login?next=${encodeURIComponent(next)}`}
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-[#002E5D]"
            >
              Continue in local beta preview
            </Link>
          )}
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#002E5D] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
