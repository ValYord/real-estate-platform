'use client'

import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'
import type { WizardFormData } from '@/lib/listings/types'

const DEAL_TYPES = [
  { value: 'sale', label: 'Sale', icon: '🏷️', desc: 'Sell your property' },
  { value: 'rent', label: 'Rent', icon: '🔑', desc: 'Rent out your property' },
] as const

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment', icon: '🏢' },
  { value: 'house', label: 'House', icon: '🏡' },
  { value: 'land', label: 'Land', icon: '🌳' },
  { value: 'commercial', label: 'Commercial', icon: '🏬' },
  { value: 'newdev', label: 'New development', icon: '🏗️' },
  { value: 'garage', label: 'Garage', icon: '🚗' },
] as const

/**
 * Step 1 — Deal type + Property type selection.
 * Uses card-select grid with role="radio" and radiogroup.
 */
export default function Step1Type() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormData>()

  const dealType = watch('dealType')
  const propertyType = watch('propertyType')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What are you listing?</h1>
        <p className="text-gray-500 mt-1">Choose the deal type and property type.</p>
      </div>

      {/* Deal type */}
      <div>
        <p
          id="deal-type-label"
          className="text-sm font-medium text-gray-700 mb-3"
        >
          Deal type <span className="text-red-500" aria-hidden="true">*</span>
        </p>
        <div
          role="radiogroup"
          aria-labelledby="deal-type-label"
          aria-required="true"
          className="grid grid-cols-2 gap-3"
        >
          {DEAL_TYPES.map(({ value, label, icon, desc }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={dealType === value}
              onClick={() => setValue('dealType', value, { shouldValidate: true })}
              className={cn(
                'flex flex-col items-start p-4 rounded-xl border transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                dealType === value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 hover:border-primary cursor-pointer',
              )}
            >
              <span className="text-2xl mb-2" aria-hidden="true">{icon}</span>
              <span className="font-semibold text-gray-900">{label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{desc}</span>
            </button>
          ))}
        </div>
        {errors.dealType && (
          <p role="alert" className="text-sm text-red-600 mt-1.5">
            {errors.dealType.message}
          </p>
        )}
      </div>

      {/* Property type */}
      <div>
        <p
          id="property-type-label"
          className="text-sm font-medium text-gray-700 mb-3"
        >
          Property type <span className="text-red-500" aria-hidden="true">*</span>
        </p>
        <div
          role="radiogroup"
          aria-labelledby="property-type-label"
          aria-required="true"
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          {PROPERTY_TYPES.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={propertyType === value}
              onClick={() => setValue('propertyType', value, { shouldValidate: true })}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                propertyType === value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 hover:border-primary cursor-pointer',
              )}
            >
              <span className="text-3xl mb-2" aria-hidden="true">{icon}</span>
              <span className="text-sm font-medium text-gray-800 text-center">{label}</span>
            </button>
          ))}
        </div>
        {errors.propertyType && (
          <p role="alert" className="text-sm text-red-600 mt-1.5">
            {errors.propertyType.message}
          </p>
        )}
      </div>
    </div>
  )
}
