'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentLeadSchema, type AgentLeadInput } from '@/lib/agent/schemas'

interface RequestLeadModalProps {
  agentId: string
  onClose: () => void
  onSent: () => void
}

const DEAL_TYPES: { value: AgentLeadInput['dealType']; label: string }[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'rent', label: 'Rent' },
]

const CURRENCIES: AgentLeadInput['currency'][] = ['AMD', 'USD', 'EUR', 'RUB']

/**
 * "Send a request" modal — docs/en/pages/10-agent-profile.md §3.7.
 * POST /api/agent-leads.
 */
export default function RequestLeadModal({ agentId, onClose, onSent }: RequestLeadModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgentLeadInput>({
    resolver: zodResolver(agentLeadSchema),
    defaultValues: {
      agentId,
      dealType: 'buy',
      currency: 'AMD',
    },
  })

  const onSubmit = async (values: AgentLeadInput) => {
    setServerError(null)
    if (values.website) return // honeypot

    try {
      const res = await fetch('/api/agent-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${next}`
        return
      }
      if (res.status === 201) {
        onSent()
        return
      }
      if (res.status === 429) {
        setServerError('Too many requests — please try again later.')
        return
      }
      setServerError('Something went wrong, please try again.')
    } catch {
      setServerError('Something went wrong, please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-lead-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="request-lead-title" className="text-base font-semibold text-gray-900">
            Send a request
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <input type="hidden" {...register('agentId')} value={agentId} />

          {/* Honeypot */}
          <input
            {...register('website')}
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            autoComplete="off"
          />

          <fieldset>
            <legend className="text-xs text-gray-500 mb-1">I want to</legend>
            <div className="flex gap-4">
              {DEAL_TYPES.map((d) => (
                <label key={d.value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" value={d.value} {...register('dealType')} />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <input
              {...register('propertyType')}
              placeholder="Property type (e.g. apartment)"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                errors.propertyType ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.propertyType && <p className="text-xs text-red-500 mt-0.5">{errors.propertyType.message}</p>}
          </div>

          <div>
            <input
              {...register('city')}
              placeholder="City"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                errors.city ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.city && <p className="text-xs text-red-500 mt-0.5">{errors.city.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              {...register('budgetMin', { valueAsNumber: true })}
              placeholder="Budget min"
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary col-span-1"
            />
            <input
              type="number"
              {...register('budgetMax', { valueAsNumber: true })}
              placeholder="Budget max"
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary col-span-1"
            />
            <select
              {...register('currency')}
              className="w-full h-10 border border-gray-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary col-span-1"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="number"
              {...register('rooms', { valueAsNumber: true })}
              placeholder="Rooms"
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <input
              {...register('name')}
              placeholder="Your name"
              autoComplete="name"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                errors.name ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
          </div>

          <div>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+374 XX XXX XXX"
              autoComplete="tel"
              className={cn(
                'w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                errors.phone ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone.message}</p>}
          </div>

          <div>
            <textarea
              {...register('message')}
              rows={3}
              placeholder="Message (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-70 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
