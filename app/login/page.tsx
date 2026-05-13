"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import { ArrowLeft, Mail, Lock, UserPlus, LogIn, EyeOff, Loader2 } from 'lucide-react'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'

function isEmailNotConfirmed(message: string) {
  return message.toLowerCase().includes('email not confirmed')
}

function authErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.toLowerCase().includes('load failed')) {
      return 'Could not reach the authentication service. Check your internet connection, then try again.'
    }

    return error.message
  }

  return 'Authentication is temporarily unavailable. Please try again.'
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const supabase = useMemo(() => createClient(), [])
  const next = searchParams.get('next') || searchParams.get('redirect') || '/dashboard'
  const callbackError = searchParams.get('error')
  const isLocalDev = process.env.NODE_ENV === 'development'
  const showConfirmationResend = isEmailNotConfirmed(error) && email.trim().length > 0

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { data, error: authError } = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectTo,
            },
          })

      if (authError) {
        setError(
          isEmailNotConfirmed(authError.message)
            ? 'Email not confirmed. You can resend the confirmation email below, or continue with the local beta preview on this machine.'
            : authError.message
        )
        return
      }

      if (data.session) {
        router.push(next)
        router.refresh()
        return
      }

      if (data.user) {
        setMode('signin')
        setNotice('Account created. Please confirm your email address, then sign in.')
      }
    } catch (authError) {
      setError(authErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  async function resendConfirmationEmail() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setResendingConfirmation(true)
    setError('')
    setNotice('')

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (resendError) {
        setError(resendError.message)
        return
      }

      setNotice('Confirmation email sent. Check your inbox and spam folder.')
    } catch (resendError) {
      setError(authErrorMessage(resendError))
    } finally {
      setResendingConfirmation(false)
    }
  }

  useEffect(() => {
    async function redirectSignedInUser() {
      const user = await getCurrentUser(supabase)

      if (user) {
        router.push(next)
      }
    }

    redirectSignedInUser()
  }, [router, next, supabase])

  return (
    <main className="app-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => router.push('/')}
            className="soft-button mx-auto mb-4 flex items-center gap-2 rounded-2xl px-3 py-2"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-3">
            Cater<span className="text-[#FF6B00]">Bids</span>.UK
          </h1>
          <p className="text-xl text-white/60 font-semibold tracking-wide uppercase">
            BUY • SELL • SAVE
          </p>
        </div>

        {/* Auth Card */}
        <div className="premium-shell rounded-[2rem] p-8">
          <div className="mb-6 rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
            <h2 className="text-xl font-black text-white">Sign in to CaterBidsUK</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Create a free account to save favourites, save searches, message sellers, and manage listings.
            </p>
          </div>

          {callbackError && (
            <div className="mb-5 rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-sm font-semibold text-red-100">
              Sign in could not be completed. Please try again.
            </div>
          )}

          <SocialLoginButtons />

          <div className="my-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            or use email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-3 px-4 rounded-2xl font-black transition-all ${
                mode === 'signin'
                  ? 'premium-button text-white'
                  : 'soft-button text-white/70'
              }`}
            >
              <LogIn size={20} className="mx-auto mb-1" />
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 rounded-2xl font-black transition-all ${
                mode === 'signup'
                  ? 'premium-button text-white'
                  : 'soft-button text-white/70'
              }`}
            >
              <UserPlus size={20} className="mx-auto mb-1" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {notice && (
              <div className="rounded-2xl border border-green-400/40 bg-green-500/15 p-4 text-green-100">
                {notice}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-red-100">
                {error}
                {showConfirmationResend && (
                  <button
                    type="button"
                    onClick={resendConfirmationEmail}
                    disabled={resendingConfirmation}
                    className="mt-3 flex min-h-10 w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendingConfirmation ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="premium-input w-full rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="premium-input w-full rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <EyeOff size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {isLocalDev && (
            <Link
              href={`/api/dev-login?next=${encodeURIComponent('/dashboard')}`}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              Continue in local beta preview
            </Link>
          )}

          <p className="text-center mt-6 text-sm text-white/50">
            By signing up, you agree to our{' '}
            <span className="text-[#FF6B00] hover:underline cursor-pointer font-semibold">Terms of Service</span>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-[#001633] via-[#0d213d] to-[#001633] flex items-center justify-center p-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
