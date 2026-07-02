'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { loginSchema, type LoginInput } from '@/lib/auth/schemas'
import { safeNext } from '@/lib/auth/safeNext'
import PasswordInput from './PasswordInput'
import GoogleButton from './GoogleButton'
import { cn } from '@/lib/utils'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNext(searchParams.get('next') ?? undefined)

  const [serverError, setServerError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    setUnverified(false)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const resJson = (await res.json()) as {
      error?: string
      userId?: string
      emailVerified?: boolean
    }

    if (res.status === 403 && resJson.error === 'email_unverified') {
      setUnverified(true)
      return
    }

    if (!res.ok) {
      if (res.status === 429) {
        setServerError('Too many attempts. Try again in 15 minutes.')
      } else {
        setServerError('Wrong email or password.')
      }
      return
    }

    router.push(nextPath)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]">
      <h1 className="text-2xl font-semibold text-gray-900">Log in</h1>
      <p className="text-sm text-gray-500 mt-1">Welcome back</p>

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Email unverified banner */}
      {unverified && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center justify-between gap-2"
        >
          <span>Verify your email to continue.</span>
          <Link
            href={`/auth/verify?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline flex-shrink-0"
          >
            Resend code
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {/* Google OAuth */}
        <GoogleButton next={nextPath} disabled={isSubmitting} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              className={cn(
                'h-11 w-full rounded-lg border px-3 text-sm transition-colors',
                'focus:outline-none focus:ring-2',
                errors.email
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
                isSubmitting && 'opacity-50 cursor-not-allowed',
              )}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            disabled={isSubmitting}
            currentValue={passwordValue}
            {...register('password')}
          />

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                {...register('remember')}
                disabled={isSubmitting}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Remember me
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Logging in…
              </span>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-gray-500">
          No account?{' '}
          <Link
            href={`/auth/register?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
