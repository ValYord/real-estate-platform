'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@/i18n/navigation'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/auth/schemas'
import { cn } from '@/lib/utils'

export default function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // Always show the neutral success message regardless of the server response
    // to prevent email enumeration.
    setSubmitted(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]">
      <h1 className="text-2xl font-semibold text-gray-900">Forgot password?</h1>
      <p className="text-sm text-gray-500 mt-1">
        Enter your email and we&apos;ll send a recovery link.
      </p>

      {submitted ? (
        <div className="mt-6 space-y-4">
          <div
            role="status"
            className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800"
          >
            If an account exists for this email, we&apos;ve sent a link.
          </div>
          <Link
            href="/auth/login"
            className="block text-center text-sm text-primary font-medium hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              className={cn(
                'h-11 w-full rounded-lg border px-3 text-sm transition-colors',
                'focus:outline-none focus:ring-2',
                errors.email
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
              )}
            />
            {errors.email && (
              <p
                id="forgot-email-error"
                role="alert"
                className="text-xs text-red-600 mt-1"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending…
              </span>
            ) : (
              'Send recovery link'
            )}
          </button>

          <Link
            href="/auth/login"
            className="block text-center text-sm text-primary font-medium hover:underline"
          >
            ← Back to login
          </Link>
        </form>
      )}
    </div>
  )
}
