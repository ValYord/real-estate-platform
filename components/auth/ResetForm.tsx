'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { resetSchema, type ResetInput } from '@/lib/auth/schemas'
import PasswordInput from './PasswordInput'

export default function ResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token') ?? ''
  const [serverError, setServerError] = useState<string | null>(null)
  const [tokenInvalid, setTokenInvalid] = useState(!token)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token },
  })

  const passwordValue = watch('password', '')
  const confirmValue = watch('confirm', '')

  const onSubmit = async (data: ResetInput) => {
    setServerError(null)

    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.status === 410) {
      setTokenInvalid(true)
      return
    }

    if (!res.ok) {
      setServerError('Something went wrong. Please try again.')
      return
    }

    router.push('/auth/login?toast=password_updated')
  }

  if (tokenInvalid) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px] text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900">
          Link expired or already used
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Password reset links are single-use and expire after 1 hour.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-6 inline-block bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Request again
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]">
      <h1 className="text-2xl font-semibold text-gray-900">Set new password</h1>
      <p className="text-sm text-gray-500 mt-1">
        Enter and confirm your new password.
      </p>

      {serverError && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-4"
      >
        {/* Hidden token */}
        <input type="hidden" {...register('token')} value={token} />

        <PasswordInput
          id="new-password"
          label="New password"
          autoComplete="new-password"
          showStrength
          error={errors.password?.message}
          disabled={isSubmitting}
          currentValue={passwordValue}
          {...register('password')}
        />

        <PasswordInput
          id="new-confirm"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          disabled={isSubmitting}
          currentValue={confirmValue}
          {...register('confirm')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            'Save new password'
          )}
        </button>
      </form>
    </div>
  )
}
