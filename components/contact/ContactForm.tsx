'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { contactPageSchema, CONTACT_SUBJECTS, type ContactPageFormValues } from '@/lib/contact/schemas'

type SubmitState = 'idle' | 'success' | 'error' | 'rate_limited'

/**
 * Contact form (Page 23 §3.2 / §5) — react-hook-form + zod, honeypot field,
 * posts to `POST /api/contact`. Field-level error text always comes from
 * `static.contact.form.errors.*` (trilingual) rather than the zod schema's
 * internal English messages, which exist only to drive `errors.<field>`
 * presence/absence — never rendered directly.
 */
export default function ContactForm() {
  const t = useTranslations('static.contact.form')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactPageFormValues>({
    resolver: zodResolver(contactPageSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'general', message: '', website: '' },
  })

  const onSubmit = async (values: ContactPageFormValues) => {
    setSubmitState('idle')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.status === 201) {
        setSubmitState('success')
        reset({ name: '', email: '', phone: '', subject: 'general', message: '', website: '' })
        return
      }

      if (res.status === 429) {
        setSubmitState('rate_limited')
        return
      }

      if (res.status === 422) {
        const body = (await res.json()) as { fields?: Record<string, string> }
        for (const field of Object.keys(body.fields ?? {})) {
          setError(field as keyof ContactPageFormValues, { type: 'server' })
        }
        setSubmitState('error')
        return
      }

      setSubmitState('error')
    } catch {
      setSubmitState('error')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitState === 'success' && (
        <p
          role="status"
          className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700"
        >
          {t('success')}
        </p>
      )}
      {submitState === 'error' && (
        <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {t('error')}
        </p>
      )}
      {submitState === 'rate_limited' && (
        <p
          role="alert"
          className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800"
        >
          {t('rateLimited')}
        </p>
      )}

      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="text-sm font-medium text-gray-700">
          {t('nameLabel')} <span className="text-red-600">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          placeholder={t('namePlaceholder')}
          className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3 focus:border-primary focus:outline-none"
          {...register('name')}
        />
        {errors.name && (
          <p id="contact-name-error" className="text-sm text-red-600 mt-1">
            {t('errors.name')}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="text-sm font-medium text-gray-700">
          {t('emailLabel')} <span className="text-red-600">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          placeholder={t('emailPlaceholder')}
          className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3 focus:border-primary focus:outline-none"
          {...register('email')}
        />
        {errors.email && (
          <p id="contact-email-error" className="text-sm text-red-600 mt-1">
            {t('errors.email')}
          </p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="contact-phone" className="text-sm font-medium text-gray-700">
          {t('phoneLabel')} <span className="text-gray-400 font-normal">({t('phoneOptional')})</span>
        </label>
        <input
          id="contact-phone"
          type="tel"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
          placeholder={t('phonePlaceholder')}
          className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3 focus:border-primary focus:outline-none"
          {...register('phone')}
        />
        {errors.phone && (
          <p id="contact-phone-error" className="text-sm text-red-600 mt-1">
            {t('errors.phone')}
          </p>
        )}
      </div>

      {/* Topic */}
      <div>
        <label htmlFor="contact-subject" className="text-sm font-medium text-gray-700">
          {t('topicLabel')}
        </label>
        <select
          id="contact-subject"
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
          className="mt-1 w-full h-11 rounded-lg border border-gray-300 px-3 focus:border-primary focus:outline-none bg-white"
          {...register('subject')}
        >
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {t(`topics.${subject}`)}
            </option>
          ))}
        </select>
        {errors.subject && (
          <p id="contact-subject-error" className="text-sm text-red-600 mt-1">
            {t('errors.subject')}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="text-sm font-medium text-gray-700">
          {t('messageLabel')} <span className="text-red-600">*</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          placeholder={t('messagePlaceholder')}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
          {...register('message')}
        />
        {errors.message && (
          <p id="contact-message-error" className="text-sm text-red-600 mt-1">
            {t('errors.message')}
          </p>
        )}
      </div>

      {/* Honeypot — visually hidden and out of the tab order; a genuine
          visitor never sees or fills it. Spam bots that blindly fill every
          input trip the server-side check in app/api/contact/route.ts. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {/* TODO: captcha — Phase 1 ships with the honeypot field above as the
          only anti-spam mechanism (docs/design/static-pages.md §0, §15). No
          captcha vendor is wired up yet; when one is added, render its
          widget here and gate `disabled={isSubmitting || !captchaVerified}`
          on the submit button below. */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? t('sending') : t('send')}
      </button>
    </form>
  )
}
