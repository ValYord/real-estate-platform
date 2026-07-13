'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { propertyDetailsFormSchema, type PropertyDetailsFormInput } from '@/lib/home-value/schemas'
import { HomeValueDisclaimer } from './HomeValueDisclaimer'

interface PropertyDetailsFormProps {
  addressLabel: string
  onSubmit: (data: PropertyDetailsFormInput) => void
  isSubmitting?: boolean
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment', icon: '🏢' },
  { value: 'house', label: 'House', icon: '🏡' },
  { value: 'land', label: 'Land', icon: '🌳' },
  { value: 'commercial', label: 'Commercial', icon: '🏬' },
] as const

const CONDITIONS = [
  { value: 'new', label: 'New construction' },
  { value: 'renovated', label: 'Renovated' },
  { value: 'good', label: 'Good' },
  { value: 'needs_renovation', label: 'Needs renovation' },
] as const

/**
 * Minimal Details form (docs §3.2) — shown only when the selected address
 * has no matching property row. react-hook-form + zod, matching the wizard's
 * form conventions (components/wizard/steps/*).
 */
export function PropertyDetailsForm({ addressLabel, onSubmit, isSubmitting }: PropertyDetailsFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropertyDetailsFormInput>({
    resolver: zodResolver(propertyDetailsFormSchema),
    defaultValues: { propertyType: 'apartment' },
  })

  const propertyType = watch('propertyType')

  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Tell us about the property</h2>
      <p className="text-sm text-gray-500 mb-5">{addressLabel}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Property type */}
        <div>
          <span className="text-sm font-medium text-gray-700 mb-1.5 block">Property type</span>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Property type">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={propertyType === t.value}
                onClick={() => setValue('propertyType', t.value, { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  propertyType === t.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <div>
          <label htmlFor="hv-area" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Area (m²) <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="hv-area"
            type="number"
            inputMode="decimal"
            aria-required="true"
            aria-invalid={errors.areaM2 ? 'true' : 'false'}
            aria-describedby={errors.areaM2 ? 'hv-area-error' : 'hv-area-hint'}
            {...register('areaM2')}
            placeholder="e.g. 75"
            className={cn(
              'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
              errors.areaM2 ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
            )}
          />
          {errors.areaM2 ? (
            <p id="hv-area-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.areaM2.message}
            </p>
          ) : (
            <p id="hv-area-hint" className="text-xs text-gray-400 mt-1">
              Area is required
            </p>
          )}
        </div>

        {/* Rooms / Year built */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hv-rooms" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Number of rooms
            </label>
            <input
              id="hv-rooms"
              type="number"
              inputMode="numeric"
              {...register('rooms')}
              placeholder="e.g. 3"
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="hv-year" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Year built
            </label>
            <input
              id="hv-year"
              type="number"
              inputMode="numeric"
              {...register('yearBuilt')}
              placeholder="e.g. 2008"
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Floor / Total floors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hv-floor" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Floor
            </label>
            <input
              id="hv-floor"
              type="number"
              inputMode="numeric"
              {...register('floor')}
              placeholder="e.g. 4"
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="hv-floors-total" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Total floors
            </label>
            <input
              id="hv-floors-total"
              type="number"
              inputMode="numeric"
              {...register('floorsTotal')}
              placeholder="e.g. 9"
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="hv-condition" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Condition
          </label>
          <select
            id="hv-condition"
            {...register('condition')}
            className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            defaultValue=""
          >
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {isSubmitting ? 'Calculating…' : 'Calculate estimate'}
        </button>

        <HomeValueDisclaimer />
      </form>
    </div>
  )
}
