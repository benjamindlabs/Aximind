'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Sparkles, Mail, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Decorative Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            AXI<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">MIND</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            AI-powered Customer Relationship Management
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100">Check your email</h3>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                We've sent a verification link to <span className="text-zinc-200 font-medium">{email}</span>. Please click the link to confirm your account.
              </p>
              <div className="pt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-zinc-100 mb-6 text-center">Create Account</h3>

              <form className="space-y-5" onSubmit={handleSignUp}>
                {error && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="full-name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <Input
                    id="full-name"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email-address" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <Input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 mt-2"
                  loading={loading}
                >
                  Create Account
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-450">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-indigo-400 hover:text-indigo-350 hover:underline transition-colors"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
