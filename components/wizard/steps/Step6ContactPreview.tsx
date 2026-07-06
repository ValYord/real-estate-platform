'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import ListingPreview from '@/components/wizard/ListingPreview'
import type { WizardFormData } from '@/lib/listings/types'

interface Step6ContactPreviewProps {
  missingSteps: string[]
  onJumpToStep: (step: number) => void
  onSaveDraft: () => void
  isSavingDraft: boolean
}

const STEP_LABELS: Record<string, { step: number; label: string }> = {
  step1: { step: 0, label: 'Type' },
  step2: { step: 1, label: 'Location' },
  step3: { step: 2, label: 'Details' },
  step4: { step: 3, label: 'Media (add photos)' },
  step5: { step: 4, label: 'Price' },
}

export default function Step6ContactPreview({
  missingSteps,
  onJumpToStep,
  onSaveDraft,
  isSavingDraft,
}: Step6ContactPreviewProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardFormData>()

  const formData = watch()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" tabIndex={-1}>
          Contact &amp; preview
        </h2>
        <p className="text-gray-500 mt-1">
          Review your listing and set your contact preferences.
        </p>
      </div>

      {/* Incomplete steps warning */}
      {missingSteps.length > 0 && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Complete these steps before publishing:
          </p>
          <ul className="space-y-1">
            {missingSteps.map((key) => {
              const info = STEP_LABELS[key]
              if (!info) return null
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onJumpToStep(info.step)}
                    className="text-sm text-amber-700 underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  >
                    Step {info.step + 1}: {info.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Your contact details</h3>

        {/* Name */}
        <div>
          <label htmlFor="contactName" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contactName"
            type="text"
            aria-required="true"
            aria-describedby={errors.contactName ? 'contactName-error' : undefined}
            aria-invalid={errors.contactName ? 'true' : 'false'}
            {...register('contactName')}
            placeholder="Your name"
            className={cn(
              'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
              errors.contactName ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
            )}
          />
          {errors.contactName && (
            <p id="contactName-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.contactName.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="contactPhone" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Phone <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contactPhone"
            type="tel"
            aria-required="true"
            aria-describedby={errors.contactPhone ? 'contactPhone-error' : undefined}
            aria-invalid={errors.contactPhone ? 'true' : 'false'}
            {...register('contactPhone')}
            placeholder="+374 XX XXX XXX"
            className={cn(
              'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
              errors.contactPhone ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
            )}
          />
          {errors.contactPhone && (
            <p id="contactPhone-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.contactPhone.message}
            </p>
          )}
        </div>

        {/* Contact preference */}
        <div>
          <p id="contact-pref-label" className="text-sm font-medium text-gray-700 mb-2">
            How should buyers reach you?
          </p>
          <Controller
            name="contactPreference"
            render={({ field }) => (
              <div role="radiogroup" aria-labelledby="contact-pref-label" className="space-y-2">
                {(
                  [
                    { value: 'phone_and_chat', label: 'Phone call + chat' },
                    { value: 'chat_only', label: 'Chat only' },
                  ] as const
                ).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      role="radio"
                      aria-checked={field.value === value}
                      checked={field.value === value}
                      onChange={() => field.onChange(value)}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>
      </div>

      {/* Terms */}
      <Controller
        name="termsAccepted"
        render={({ field }) => (
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={field.value === true}
                onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                aria-required="true"
                aria-describedby={errors.termsAccepted ? 'terms-error' : undefined}
                aria-invalid={errors.termsAccepted ? 'true' : 'false'}
                className={cn(
                  'mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary',
                  errors.termsAccepted ? 'border-red-400' : '',
                )}
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="text-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  target="_blank"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .{' '}
                <span className="text-red-500" aria-hidden="true">*</span>
              </span>
            </label>
            {errors.termsAccepted && (
              <p id="terms-error" role="alert" className="text-sm text-red-600 mt-1.5">
                {errors.termsAccepted.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Save as draft button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
          className="h-11 px-6 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          {isSavingDraft ? 'Saving…' : '💾 Save as draft'}
        </button>
      </div>

      {/* Live preview */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Listing preview</h3>
        <ListingPreview data={formData} />
      </div>
    </div>
  )
}
