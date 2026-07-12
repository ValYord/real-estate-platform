'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tourRequestSchema, TOUR_TYPES, type TourRequestInput } from '@/lib/tours/schemas'
import { buildDateOptions, buildTimeSlots, buildRequestedAtIso } from '@/lib/tours/helpers'

interface ScheduleTourModalProps {
  propertyId: string
  currentUser: { name: string | null; phone: string | null } | null
  onClose: () => void
  onSent: () => void
}

/**
 * "Schedule a tour" booking modal — Page 27 (MVP).
 * docs/design/27-schedule-tour-handoff.md §4.
 * POST /api/tours.
 */
export default function ScheduleTourModal({ propertyId, currentUser, onClose, onSent }: ScheduleTourModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [alreadyRequested, setAlreadyRequested] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Stable "now" for the lifetime of the modal — avoids the date/time grids
  // re-rendering on every tick while still reflecting the real time on open.
  const now = useMemo(() => new Date(), [])
  const dateOptions = useMemo(() => buildDateOptions(now, 14), [now])

  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.date ?? '')
  const timeSlots = useMemo(() => buildTimeSlots(selectedDate, now), [selectedDate, now])
  const firstEnabledSlot = timeSlots.find((s) => !s.disabled)?.time ?? ''
  const [selectedTime, setSelectedTime] = useState(firstEnabledSlot)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TourRequestInput>({
    resolver: zodResolver(tourRequestSchema),
    defaultValues: {
      propertyId,
      tourType: 'in_person',
      name: currentUser?.name ?? '',
      phone: currentUser?.phone ?? '',
      requestedAt: buildRequestedAtIso(dateOptions[0]?.date ?? '', firstEnabledSlot || '09:00'),
    },
  })

  const tourType = watch('tourType')

  // Auto-focus the close button on mount, close on Escape — matches
  // DeleteConfirmModal.tsx's fuller a11y treatment (booking is more
  // consequential than the delete-confirm's own use case).
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    const slots = buildTimeSlots(date, now)
    const firstEnabled = slots.find((s) => !s.disabled)?.time ?? ''
    setSelectedTime(firstEnabled)
    setValue('requestedAt', buildRequestedAtIso(date, firstEnabled || '09:00'))
  }

  const handleSelectTime = (time: string) => {
    setSelectedTime(time)
    setValue('requestedAt', buildRequestedAtIso(selectedDate, time))
  }

  const onSubmit = async (values: TourRequestInput) => {
    setServerError(null)
    setAlreadyRequested(false)
    if (values.website) return // honeypot

    try {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.status === 201) {
        onSent()
        return
      }
      if (res.status === 409) {
        setAlreadyRequested(true)
        return
      }
      if (res.status === 429) {
        setServerError('Too many requests — please try again later.')
        return
      }
      if (res.status === 400) {
        const body = (await res.json()) as { error?: string }
        if (body.error === 'property_inactive') {
          setServerError('This property is no longer available.')
          return
        }
      }
      setServerError('Something went wrong, please try again.')
    } catch {
      setServerError('Something went wrong, please try again.')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-tour-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="schedule-tour-title" className="text-base font-semibold text-gray-900">
            Schedule a tour
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {alreadyRequested ? (
          <div className="space-y-4">
            <div
              role="status"
              className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 text-center"
            >
              You already have a pending tour request for this property. The owner will be in touch.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <input type="hidden" {...register('propertyId')} value={propertyId} />
            <input type="hidden" {...register('requestedAt')} />

            {/* Honeypot */}
            <input
              {...register('website')}
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
              autoComplete="off"
            />

            {/* Tour type */}
            <fieldset role="radiogroup" aria-label="Tour type">
              <legend className="text-xs text-gray-500 mb-1.5">Tour type</legend>
              <div className="flex gap-2">
                {TOUR_TYPES.map((t) => (
                  <label
                    key={t}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-medium cursor-pointer',
                      tourType === t
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 text-gray-700 hover:border-primary',
                    )}
                  >
                    <input type="radio" className="sr-only" value={t} {...register('tourType')} />
                    {t === 'in_person' ? '📍 In-person' : '📹 Video call'}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Date strip */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Date</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dateOptions.map((opt) => {
                  const selected = opt.date === selectedDate
                  const [weekday, month, day] = opt.label.split(' ')
                  return (
                    <button
                      key={opt.date}
                      type="button"
                      aria-label={`${weekday}, ${month} ${day}`}
                      aria-pressed={selected}
                      onClick={() => handleSelectDate(opt.date)}
                      className={cn(
                        'rounded-xl w-12 h-14 flex flex-col items-center justify-center flex-shrink-0 text-xs',
                        selected
                          ? 'bg-primary text-white'
                          : 'border border-gray-200 text-gray-700 hover:border-primary cursor-pointer',
                      )}
                    >
                      <span>{weekday}</span>
                      <span className="font-semibold">{day}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Time</p>
              <div role="listbox" aria-label="Time" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot) => {
                  const selected = slot.time === selectedTime
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-disabled={slot.disabled}
                      disabled={slot.disabled}
                      onClick={() => handleSelectTime(slot.time)}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium',
                        slot.disabled
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : selected
                            ? 'bg-primary text-white'
                            : 'border border-gray-300 hover:border-primary cursor-pointer',
                      )}
                    >
                      {slot.time}
                      {slot.disabled && <span className="sr-only"> Unavailable</span>}
                    </button>
                  )
                })}
              </div>
              {errors.requestedAt && <p className="text-xs text-red-500 mt-1">{errors.requestedAt.message}</p>}
            </div>

            {/* Name / phone / message */}
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
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
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
              {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone.message}</p>}
            </div>

            <div>
              <textarea
                {...register('note')}
                rows={3}
                maxLength={300}
                placeholder="Message to owner (optional)"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                  errors.note ? 'border-red-300' : 'border-gray-200',
                )}
              />
              {errors.note && <p className="text-xs text-red-500 mt-0.5">{errors.note.message}</p>}
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
              Request tour
            </button>

            <p className="text-xs text-gray-400 text-center">Anti-spam protected. Your data is safe.</p>
          </form>
        )}
      </div>
    </div>
  )
}
