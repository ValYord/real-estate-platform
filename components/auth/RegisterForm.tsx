'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { registerSchema, type RegisterInput } from '@/lib/auth/schemas'
import { safeNext } from '@/lib/auth/safeNext'
import PasswordInput from './PasswordInput'
import RoleToggle from './RoleToggle'
import GoogleButton from './GoogleButton'
import { cn } from '@/lib/utils'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNext(searchParams.get('next') ?? undefined)

  const [serverError, setServerError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user',
      marketing: false,
    },
  })

  const role = watch('role')
  const passwordValue = watch('password', '')
  const confirmValue = watch('confirm', '')

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    setEmailTaken(false)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const resJson = (await res.json()) as { error?: string; userId?: string }

    if (res.status === 409 && resJson.error === 'email_taken') {
      setEmailTaken(true)
      return
    }

    if (!res.ok) {
      if (res.status === 429) {
        setServerError('Too many attempts. Please try again later.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
      return
    }

    router.push(
      `/auth/verify?email=${encodeURIComponent(data.email)}&next=${encodeURIComponent(nextPath)}`
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]">
      <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
      <p className="text-sm text-gray-500 mt-1">
        Join thousands of buyers, sellers and agents
      </p>

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Email taken banner */}
      {emailTaken && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-2"
        >
          <span>An account with this email already exists.</span>
          <Link
            href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline flex-shrink-0"
          >
            Log in
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
          {/* Role toggle */}
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <RoleToggle
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />

          {/* Full name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
              {...register('name')}
              className={cn(
                'h-11 w-full rounded-lg border px-3 text-sm transition-colors',
                'focus:outline-none focus:ring-2',
                errors.name
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
              )}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
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
                id="reg-email-error"
                role="alert"
                className="text-xs text-red-600 mt-1"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+37491000000"
              disabled={isSubmitting}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              aria-invalid={!!errors.phone}
              {...register('phone')}
              className={cn(
                'h-11 w-full rounded-lg border px-3 text-sm transition-colors',
                'focus:outline-none focus:ring-2',
                errors.phone
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
              )}
            />
            {errors.phone && (
              <p id="phone-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Password */}
          <PasswordInput
            id="reg-password"
            label="Password"
            autoComplete="new-password"
            showStrength
            error={errors.password?.message}
            disabled={isSubmitting}
            currentValue={passwordValue}
            {...register('password')}
          />

          {/* Confirm password */}
          <PasswordInput
            id="confirm"
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            disabled={isSubmitting}
            currentValue={confirmValue}
            {...register('confirm')}
          />

          {/* Agency name (only for agents) */}
          {role === 'agent' && (
            <div>
              <label
                htmlFor="agencyName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Agency name
              </label>
              <input
                id="agencyName"
                type="text"
                autoComplete="organization"
                disabled={isSubmitting}
                aria-describedby={
                  errors.agencyName ? 'agencyName-error' : undefined
                }
                aria-invalid={!!errors.agencyName}
                {...register('agencyName')}
                className={cn(
                  'h-11 w-full rounded-lg border px-3 text-sm transition-colors',
                  'focus:outline-none focus:ring-2',
                  errors.agencyName
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
                )}
              />
              {errors.agencyName && (
                <p
                  id="agencyName-error"
                  role="alert"
                  className="text-xs text-red-600 mt-1"
                >
                  {errors.agencyName.message}
                </p>
              )}
            </div>
          )}

          {/* Terms */}
          <div>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                disabled={isSubmitting}
                aria-describedby={errors.terms ? 'terms-error' : undefined}
                aria-invalid={!!errors.terms}
                {...register('terms')}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                I accept the{' '}
                <Link
                  href="/legal/terms"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  terms of service
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p id="terms-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.terms.message}
              </p>
            )}
          </div>

          {/* Marketing opt-in */}
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              {...register('marketing')}
              disabled={isSubmitting}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Send me marketing updates
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Registering…
              </span>
            ) : (
              'Register'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
