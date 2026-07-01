"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const strength = passwordStrength(password)

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 10) {
      setError("New passwords must be at least 10 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    setError("")
    setNotice("")

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      setNotice("Your CaterBidsUK password has been updated.")
      setTimeout(() => {
        router.push("/account")
        router.refresh()
      }, 800)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Password update failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#002E5D] px-4 py-6 text-[#002E5D]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <Link
          href="/login"
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white"
        >
          <ArrowLeft size={16} /> Back to login
        </Link>

        <section className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-black/25">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </h1>
            <h2 className="mt-5 text-2xl font-black">Set a new password</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">The UK Marketplace for Catering Equipment</p>
            <p className="mt-2 text-xs font-black tracking-[0.22em] text-[#FF6B00]">BUY • SELL • SAVE</p>
          </div>

          {notice && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
              {error}
            </div>
          )}

          <form onSubmit={updatePassword} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-black">New password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password, 10+ characters"
                  minLength={10}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-bold outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
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
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-black">Confirm password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                minLength={10}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                required
              />
            </label>

            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#FF6B00] transition-all"
                  style={{ width: `${Math.max(8, strength.score * 25)}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">Password strength: {strength.label}</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={16} />}
              Update password
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Your reset link is secure and only works for your CaterBidsUK account session.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
