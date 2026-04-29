"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, Lock, UserPlus, LogIn, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const supabase = createClient()
  const redirectTo = searchParams.get('redirect') || '/account'

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = mode === 'signin' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
    } else if (data.user) {
      router.push(redirectTo)
      router.refresh()
    }

    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(redirectTo)
      }
    })
  }, [router, redirectTo, supabase])

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#001633] via-[#0d213d] to-[#001633] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 mx-auto mb-4 text-white/70 hover:text-white"
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
        <div className="bg-[#0d213d]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-3 px-4 rounded-2xl font-black transition-all ${
                mode === 'signin'
                  ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <LogIn size={20} className="mx-auto mb-1" />
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 rounded-2xl font-black transition-all ${
                mode === 'signup'
                  ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <UserPlus size={20} className="mx-auto mb-1" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 text-red-100">
                {error}
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 focus:border-[#FF6B00] focus:outline-none transition-all"
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/40 focus:border-[#FF6B00] focus:outline-none transition-all"
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
              className="w-full bg-[#FF6B00] text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-[#ff7d22] hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          <p className="text-center mt-6 text-sm text-white/50">
            By signing up, you agree to our{' '}
            <span className="text-[#FF6B00] hover:underline cursor-pointer font-semibold">Terms of Service</span>
          </p>
        </div>
      </div>
    </main>
  )
}

