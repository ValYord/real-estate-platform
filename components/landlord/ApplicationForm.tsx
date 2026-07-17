'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import FadeIn from '@/components/motion/FadeIn'
import DisclaimerBanner from './DisclaimerBanner'
import { applicationSchema, type ApplicationInput } from '@/lib/landlord/schemas'

const DEFAULT_VALUES: Partial<ApplicationInput> = {
  applicantName: '',
  contact: '',
  employment: '',
  residence: '',
  references: '',
  declaration: '',
}

/**
 * The public tenant-facing application form at `/apply/[token]` (§3.3
 * "Application form (filled by the tenant)"). Unauthenticated — posts
 * directly to `POST /api/apply/[token]`, which validates the same
 * `applicationSchema` server-side (client validation here is a UX
 * convenience, never the source of truth).
 */
export default function ApplicationForm({ token, unitAddress }: { token: string; unitAddress: string }) {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: DEFAULT_VALUES as ApplicationInput,
  })

  const onSubmit = async (values: ApplicationInput) => {
    try {
      const res = await fetch(`/api/apply/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.status === 201) {
        setSubmitted(true)
        return
      }

      if (res.status === 422) {
        const body = (await res.json()) as { fields?: Record<string, string[]> }
        for (const field of Object.keys(body.fields ?? {})) {
          setError(field as keyof ApplicationInput, { type: 'server' })
        }
        return
      }

      if (res.status === 404) {
        setError('root', { type: 'server', message: 'This application link is no longer valid.' })
        return
      }

      setError('root', { type: 'server', message: 'Something went wrong. Please try again.' })
    } catch {
      setError('root', { type: 'server', message: 'Something went wrong. Please try again.' })
    }
  }

  if (submitted) {
    return (
      <FadeIn>
        <div className="rounded-lg border border-border bg-surface p-6 text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-2xl" aria-hidden="true">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-text">Application sent</h2>
          <p className="text-sm text-muted">
            The landlord will review your application and follow up directly.
          </p>
        </div>
      </FadeIn>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Rental application</h1>
        <p className="text-muted mt-1">Applying for: {unitAddress}</p>
      </div>

      <DisclaimerBanner>
        <p>
          This application is advisory, not legal advice. No automatic background or credit check is
          performed — the landlord reviews applications manually. Follow local law; discrimination is
          prohibited; screening requires your consent (see the checkbox below).
        </p>
      </DisclaimerBanner>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <p role="alert" className="text-sm text-danger">
            {errors.root.message}
          </p>
        )}

        <Field label="Full name" htmlFor="app-name" error={errors.applicantName?.message}>
          <Input id="app-name" aria-invalid={!!errors.applicantName} {...register('applicantName')} />
        </Field>

        <Field label="Contact (phone or email)" htmlFor="app-contact" error={errors.contact?.message}>
          <Input id="app-contact" aria-invalid={!!errors.contact} {...register('contact')} />
        </Field>

        <Field label="Employment" htmlFor="app-employment" hint="Optional" error={errors.employment?.message}>
          <Input id="app-employment" aria-invalid={!!errors.employment} {...register('employment')} />
        </Field>

        <Field label="Monthly income" htmlFor="app-income" hint="Optional" error={errors.income?.message}>
          <Input id="app-income" type="number" min={0} step="1" aria-invalid={!!errors.income} {...register('income')} />
        </Field>

        <Field label="Current residence" htmlFor="app-residence" hint="Optional" error={errors.residence?.message}>
          <Input id="app-residence" aria-invalid={!!errors.residence} {...register('residence')} />
        </Field>

        <Field label="References" htmlFor="app-references" hint="Optional — name and contact of a reference" error={errors.references?.message}>
          <Input id="app-references" aria-invalid={!!errors.references} {...register('references')} />
        </Field>

        <Field
          label="Self-declaration"
          htmlFor="app-declaration"
          hint="Optional — anything else you'd like the landlord to know"
          error={errors.declaration?.message}
        >
          <textarea
            id="app-declaration"
            rows={4}
            aria-invalid={!!errors.declaration}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            {...register('declaration')}
          />
        </Field>

        <div className="flex items-start gap-2">
          <input
            id="app-consent"
            type="checkbox"
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? 'app-consent-error' : undefined}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            {...register('consent')}
          />
          <label htmlFor="app-consent" className="text-sm text-text">
            I consent to the landlord reviewing this application for tenant screening purposes.
          </label>
        </div>
        {errors.consent && (
          <p id="app-consent-error" role="alert" className="text-sm text-danger -mt-2">
            {errors.consent.message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          Submit application
        </Button>
      </form>
    </div>
  )
}
