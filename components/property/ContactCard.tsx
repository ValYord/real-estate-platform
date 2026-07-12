'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageSquare, Phone, Star, CheckCircle, User, Loader2, CalendarClock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { contactSchema, type ContactFormValues } from '@/lib/property/schemas'
import type { PropertyOwner } from '@/lib/property/types'
import ScheduleTourModal from './ScheduleTourModal'

interface ContactCardProps {
  owner: PropertyOwner
  propertyId: string
  /** Mirrors MobileBottomBar's existing prop — disables the tour CTA for sold/archived listings. */
  isAvailable: boolean
  /** Prefill for the "Schedule a tour" form; `null` for guests. */
  currentUser: { name: string | null; phone: string | null } | null
}

/**
 * Sidebar contact card — "Send message", "Show phone", quick contact form.
 * Auth-gated: guests are redirected to login. The "Schedule a tour" CTA
 * (Page 27) is the exception — guests may submit a tour request directly.
 */
export default function ContactCard({ owner, propertyId, isAvailable, currentUser }: ContactCardProps) {
  const [phoneVisible, setPhoneVisible] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [showTourModal, setShowTourModal] = useState(false)
  const [tourRequested, setTourRequested] = useState(false)
  const [tourToastVisible, setTourToastVisible] = useState(false)

  const handleTourSent = () => {
    setShowTourModal(false)
    setTourRequested(true)
    setTourToastVisible(true)
    setTimeout(() => setTourToastVisible(false), 4000)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      message: `Hi, I am interested in this property (#${propertyId}).`,
    },
  })

  // ── Send message (opens/creates conversation) ────────────────────────────
  const handleSendMessage = async () => {
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          message: `Hi, I am interested in this property (#${propertyId}).`,
        }),
      })

      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${next}`
        return
      }

      if (res.ok) {
        const data = (await res.json()) as { conversationId: string }
        // Redirect to the conversation
        window.location.href = `/messages/${data.conversationId}`
      }
    } catch {
      // ignore
    } finally {
      setMsgLoading(false)
    }
  }

  // ── Reveal phone ─────────────────────────────────────────────────────────
  const handleShowPhone = () => {
    setPhoneVisible(true)
  }

  // ── Quick contact form submit ─────────────────────────────────────────────
  const onSubmit = async (values: ContactFormValues) => {
    // Honeypot check (server also validates)
    if (values.website) return

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, message: values.message }),
    })

    if (res.status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/auth/login?next=${next}`
      return
    }

    if (res.ok) {
      setFormSuccess(true)
      reset()
    }
  }

  const agentInfo = owner.agent

  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-5 space-y-5 sticky top-20">
      {/* Owner header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {owner.avatar ? (
            <Image
              src={owner.avatar}
              alt={owner.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{owner.name}</p>
          {agentInfo?.agency && (
            <p className="text-sm text-gray-500 truncate">{agentInfo.agency}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {agentInfo?.verified && (
              <span className="flex items-center gap-0.5 text-xs text-blue-600">
                <CheckCircle className="w-3 h-3" aria-hidden="true" />
                Verified
              </span>
            )}
            {agentInfo?.rating != null && agentInfo.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                {agentInfo.rating.toFixed(1)}
                {agentInfo.reviews != null && (
                  <span className="text-gray-400 ml-0.5">({agentInfo.reviews})</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="space-y-3">
        <button
          onClick={handleSendMessage}
          disabled={msgLoading}
          className="w-full h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {msgLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          )}
          Send a message
        </button>

        {owner.phone ? (
          <button
            onClick={handleShowPhone}
            className="w-full h-12 border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            {phoneVisible ? (
              <a
                href={`tel:${owner.phone.replace(/\s/g, '')}`}
                className="font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {owner.phone}
              </a>
            ) : (
              'Show phone'
            )}
          </button>
        ) : null}

        <button
          onClick={() => setShowTourModal(true)}
          disabled={!isAvailable}
          className="w-full h-12 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <CalendarClock className="w-4 h-4" aria-hidden="true" />
          Schedule a tour
        </button>

        {tourRequested && (
          <p
            role="status"
            className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center"
          >
            Tour requested — the owner will confirm soon.
          </p>
        )}
      </div>

      {showTourModal && (
        <ScheduleTourModal
          propertyId={propertyId}
          currentUser={currentUser}
          onClose={() => setShowTourModal(false)}
          onSent={handleTourSent}
        />
      )}

      {tourToastVisible && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm w-full mx-4 bg-gray-900 text-white"
        >
          <span className="flex-1">Tour requested — the owner will confirm soon.</span>
        </div>
      )}

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Quick contact form */}
      {formSuccess ? (
        <div
          role="status"
          className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 text-center"
        >
          Sent — the seller will get in touch.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <p className="text-sm font-medium text-gray-700">Or send a quick message</p>

          {/* Honeypot (hidden) */}
          <input
            {...register('website')}
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            autoComplete="off"
          />

          <div>
            <input
              {...register('name')}
              type="text"
              placeholder="Your name"
              autoComplete="name"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                errors.name ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>
            )}
          </div>

          <div>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+374 XX XXX XXX"
              autoComplete="tel"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                errors.phone ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-0.5">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <textarea
              {...register('message')}
              rows={3}
              className={cn(
                'w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                errors.message ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.message && (
              <p className="text-xs text-red-500 mt-0.5">{errors.message.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              'Send'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Anti-spam protected. Your data is safe.
          </p>
        </form>
      )}
    </div>
  )
}
