'use client'

import { useState, type FormEvent } from 'react'

interface NewsletterFormProps {
  source: 'news_index' | 'article' | 'footer'
}

type Status = 'idle' | 'submitting' | 'success' | 'already_subscribed' | 'error'

/**
 * Newsletter signup form — POSTs to /api/newsletter/subscribe and shows an
 * inline confirmation state. No real ESP integration; this is
 * persist-only + confirmation UI (docs/en/pages/15-blog.md §3.11, task scope note).
 */
export default function NewsletterForm({ source }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })

      if (res.status === 202) {
        setStatus('success')
        return
      }
      if (res.status === 409) {
        setStatus('already_subscribed')
        return
      }
      setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p role="status" className="text-sm font-medium text-primary">
        Thanks — you&apos;re subscribed to the newsletter.
      </p>
    )
  }

  if (status === 'already_subscribed') {
    return (
      <p role="status" className="text-sm font-medium text-gray-700">
        You are already subscribed.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <label htmlFor={`newsletter-email-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`newsletter-email-${source}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-11 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="h-11 px-6 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600 sm:ml-2 sm:self-center">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  )
}
