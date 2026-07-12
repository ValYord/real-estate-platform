'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@/i18n/navigation'
import { profileSchema, type ProfileInput } from '@/lib/settings/schemas'
import { useSettings, useDirtyFormGuard } from './SettingsContext'
import AvatarUploader from './AvatarUploader'
import SaveBar from './SaveBar'

/** Profile tab (§3.2): name, phone (with re-verify gate), bio, avatar. */
export default function ProfileForm() {
  const { user, updateUser, showToast } = useSettings()
  const [reverifyPhone, setReverifyPhone] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? '',
      bio: user.bio ?? '',
    },
  })

  const submit = useCallback(
    async (data: ProfileInput): Promise<boolean> => {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        showToast('Could not save your profile. Try again.', 'error')
        return false
      }

      const body = (await res.json()) as { ok: true; reverify: string[] }
      updateUser({ name: data.name, phone: data.phone, bio: data.bio ?? null })
      if (body.reverify.includes('phone')) setReverifyPhone(true)
      reset(data)
      showToast('Profile saved')
      return true
    },
    [reset, showToast, updateUser],
  )

  useDirtyFormGuard({
    dirty: isDirty,
    onSave: () => handleSubmit(submit)().then(() => true).catch(() => false),
    onDiscard: () =>
      reset({ name: user.name, phone: user.phone ?? '', bio: user.bio ?? '' }),
  })

  const onSubmit = handleSubmit(async (data) => {
    await submit(data)
  })

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>

      <AvatarUploader
        name={user.name}
        avatarUrl={user.avatarUrl}
        onUpload={(url) => updateUser({ avatarUrl: url })}
        onRemove={() => updateUser({ avatarUrl: null })}
      />

      {reverifyPhone && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center justify-between gap-2"
        >
          <span>The new number must be verified.</span>
          <Link href="/auth/verify" className="text-primary font-medium hover:underline flex-shrink-0">
            Verify now
          </Link>
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-md">
        <div className="flex flex-col gap-1 mb-4">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
            className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          {errors.name && (
            <p id="name-error" role="alert" className="text-xs text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            {...register('phone')}
            className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          {errors.phone && (
            <p id="phone-error" role="alert" className="text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label htmlFor="bio" className="text-sm font-medium text-gray-700">
            Bio / About
          </label>
          <textarea
            id="bio"
            rows={4}
            maxLength={500}
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
            {...register('bio')}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          {errors.bio && (
            <p id="bio-error" role="alert" className="text-xs text-red-600">
              {errors.bio.message}
            </p>
          )}
        </div>

        <SaveBar
          dirty={isDirty}
          saving={isSubmitting}
          onSave={() => void onSubmit()}
          onCancel={() => reset({ name: user.name, phone: user.phone ?? '', bio: user.bio ?? '' })}
        />
      </form>
    </div>
  )
}
