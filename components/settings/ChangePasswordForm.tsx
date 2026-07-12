'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { passwordSchema, type PasswordInput as PasswordFormInput } from '@/lib/settings/schemas'
import { useSettings, useDirtyFormGuard } from './SettingsContext'
import PasswordInput from '@/components/auth/PasswordInput'

/** Account tab — change password (§3.3, Scenario B). */
export default function ChangePasswordForm() {
  const { showToast } = useSettings()
  const [wrongCurrent, setWrongCurrent] = useState(false)
  const [revokeOthers, setRevokeOthers] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PasswordFormInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', new: '', confirm: '' },
  })

  const newValue = watch('new', '')

  const submit = useCallback(
    async (data: PasswordFormInput): Promise<boolean> => {
      setWrongCurrent(false)
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, revokeOthers }),
      })

      if (res.status === 401) {
        setWrongCurrent(true)
        setError('current', { message: 'The current password is incorrect' })
        return false
      }
      if (!res.ok) {
        showToast('Could not update your password. Try again.', 'error')
        return false
      }

      reset({ current: '', new: '', confirm: '' })
      showToast('Password changed')
      return true
    },
    [reset, revokeOthers, setError, showToast],
  )

  useDirtyFormGuard({
    dirty: isDirty,
    onSave: () => handleSubmit(submit)().then(() => true).catch(() => false),
    onDiscard: () => reset({ current: '', new: '', confirm: '' }),
  })

  const onSubmit = handleSubmit(async (data) => {
    await submit(data)
  })

  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Change password</h3>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-md space-y-4">
        <PasswordInput
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          error={wrongCurrent ? 'The current password is incorrect' : errors.current?.message}
          disabled={isSubmitting}
          {...register('current')}
        />
        <PasswordInput
          id="new-password"
          label="New password"
          autoComplete="new-password"
          showStrength
          currentValue={newValue}
          error={errors.new?.message}
          disabled={isSubmitting}
          {...register('new')}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          disabled={isSubmitting}
          {...register('confirm')}
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={revokeOthers}
            onChange={(e) => setRevokeOthers(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Sign out other devices
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white h-10 rounded-lg px-4 disabled:opacity-50 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
