'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { hasSessionCookie } from '@/lib/auth/hasSessionCookie'
import { buildPreApprovalLoginRedirect } from '@/lib/mortgage/rates/redirect'
import { preApprovalFormSchema, type PreApprovalFormValues } from '@/lib/mortgage/rates/schemas'

interface PreApprovalCtaBlockProps {
  defaultCountry?: string
  defaultCurrency?: string
  defaultLoanAmount?: number
}

const inputClass =
  'h-11 w-full border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

/**
 * Minimal "Get pre-approved" lead form — name/phone/loanAmount/consent
 * (D of task brief: incomeRange/bankIds omitted for MVP). Guest submit
 * hard-redirects to /auth/login?next=... (D7) instead of opening a modal;
 * logged-in submit posts to /api/mortgage/preapproval.
 */
export default function PreApprovalCtaBlock({
  defaultCountry,
  defaultCurrency,
  defaultLoanAmount,
}: PreApprovalCtaBlockProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PreApprovalFormValues>({
    resolver: zodResolver(preApprovalFormSchema),
    defaultValues: {
      loanAmount: defaultLoanAmount,
      country: defaultCountry,
      currency: defaultCurrency as PreApprovalFormValues['currency'],
      website: '',
    },
  })

  const redirectToLogin = () => {
    const search = searchParams.toString()
    const next = buildPreApprovalLoginRedirect(pathname, search ? `?${search}` : '')
    router.push(next as Parameters<typeof router.push>[0])
  }

  const onSubmit = async (values: PreApprovalFormValues) => {
    setServerError(null)

    if (values.website) {
      // Honeypot filled in — say nothing, do nothing (server would 201 "discarded" too).
      return
    }

    if (!consent) {
      setConsentError('Consent is required')
      return
    }
    setConsentError(null)

    // Guest gate: hard redirect before ever calling the API (D7), same
    // cookie-sniff mechanism as lib/favorites/useFavoriteToggle.ts.
    if (!hasSessionCookie()) {
      redirectToLogin()
      return
    }

    try {
      const res = await fetch('/api/mortgage/preapproval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, consent }),
      })

      if (res.status === 401) {
        redirectToLogin()
        return
      }
      if (res.status === 429) {
        setServerError('Too many applications. Please try again later.')
        return
      }
      if (!res.ok) {
        setServerError('Something went wrong. Please try again.')
        return
      }

      setSuccess(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  return (
    <div id="preapproval" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-20">
      <h2 className="text-xl font-semibold text-gray-900">Get pre-approved</h2>
      <p className="text-sm text-gray-500 mt-1">
        This is only an application, not an approval — a partner bank will follow up.
      </p>

      {success ? (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm">
          Your application was sent — the bank will contact you.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
          {/* Honeypot (hidden) */}
          <input
            {...register('website')}
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
          />

          {serverError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="preapproval-name" className="text-xs font-medium text-gray-700 mb-1 block">
              Name
            </label>
            <input
              id="preapproval-name"
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'preapproval-name-error' : undefined}
              {...register('name')}
              className={inputClass}
            />
            {errors.name && (
              <p id="preapproval-name-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="preapproval-phone" className="text-xs font-medium text-gray-700 mb-1 block">
              Phone
            </label>
            <input
              id="preapproval-phone"
              type="tel"
              placeholder="+374 XX XXX XXX"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'preapproval-phone-error' : undefined}
              {...register('phone')}
              className={inputClass}
            />
            {errors.phone && (
              <p id="preapproval-phone-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="preapproval-loan-amount" className="text-xs font-medium text-gray-700 mb-1 block">
              Loan amount
            </label>
            <input
              id="preapproval-loan-amount"
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={!!errors.loanAmount}
              aria-describedby={errors.loanAmount ? 'preapproval-loan-amount-error' : undefined}
              {...register('loanAmount')}
              className={inputClass}
            />
            {errors.loanAmount && (
              <p id="preapproval-loan-amount-error" role="alert" className="text-xs text-red-600 mt-1">
                {errors.loanAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked)
                  if (e.target.checked) setConsentError(null)
                }}
                aria-invalid={!!consentError}
                aria-describedby={consentError ? 'preapproval-consent-error' : undefined}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              I consent to sharing this information with the partner bank.
            </label>
            {consentError && (
              <p id="preapproval-consent-error" role="alert" className="text-xs text-red-600 mt-1">
                {consentError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'h-11 px-6 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2',
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Sending…' : 'Send application'}
          </button>
        </form>
      )}
    </div>
  )
}
