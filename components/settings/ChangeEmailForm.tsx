'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changeEmailSchema, type ChangeEmailInput } from '@/lib/settings/schemas'
import { useSettings, useDirtyFormGuard } from './SettingsContext'

/** Account tab — change email (§3.3). Dual-confirmation via Supabase's secure email change. */
export default function ChangeEmailForm() {
  const { user, showToast } = useSettings()
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '' },
  })

  const submit = useCallback(
    async (data: ChangeEmailInput): Promise<boolean> => {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.status === 409) {
        setError('newEmail', { message: 'This email is already in use' })
        return false
      }
      if (!res.ok) {
        showToast('Could not start the email change. Try again.', 'error')
        return false
      }

      setConfirmationSentTo(data.newEmail)
      reset({ newEmail: '' })
      return true
    },
    [reset, setError, showToast],
  )

  useDirtyFormGuard({
    dirty: isDirty,
    onSave: () => handleSubmit(submit)().then(() => true).catch(() => false),
    onDiscard: () => reset({ newEmail: '' }),
  })

  const onSubmit = handleSubmit(async (data) => {
    await submit(data)
  })

  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Change email</h3>
      <p className="text-sm text-gray-500 mb-3">Current email: {user.email}</p>

      {confirmationSentTo && (
        <div
          role="status"
          className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800"
        >
          A confirmation link was sent to {confirmationSentTo}.
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-md flex items-start gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="new-email" className="sr-only">
            New email
          </label>
          <input
            id="new-email"
            type="email"
            inputMode="email"
            placeholder="new@example.com"
            aria-invalid={!!errors.newEmail}
            aria-describedby={errors.newEmail ? 'new-email-error' : undefined}
            {...register('newEmail')}
            className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          {errors.newEmail && (
            <p id="new-email-error" role="alert" className="text-xs text-red-600">
              {errors.newEmail.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white h-11 rounded-lg px-4 disabled:opacity-50 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
        >
          {isSubmitting ? 'Sending…' : 'Change email'}
        </button>
      </form>
    </div>
  )
}
