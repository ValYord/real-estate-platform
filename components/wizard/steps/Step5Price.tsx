'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import type { WizardFormData } from '@/lib/listings/types'

const CURRENCIES = [
  { value: 'AMD', symbol: '֏', label: 'AMD' },
  { value: 'USD', symbol: '$', label: 'USD' },
  { value: 'EUR', symbol: '€', label: 'EUR' },
  { value: 'RUB', symbol: '₽', label: 'RUB' },
] as const

export default function Step5Price() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardFormData>()

  const dealType = watch('dealType')
  const currency = watch('currency') ?? 'AMD'
  const negotiable = watch('negotiable')
  const utilitiesIncluded = watch('utilitiesIncluded')
  const isRent = dealType === 'rent'

  const selectedCurrency = CURRENCIES.find((c) => c.value === currency)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" tabIndex={-1}>
          How much?
        </h2>
        <p className="text-gray-500 mt-1">
          Set the price{isRent ? ' per month' : ''} for your property.
        </p>
      </div>

      {/* Price + Currency */}
      <div>
        <label
          htmlFor="price"
          className="text-sm font-medium text-gray-700 mb-1.5 block"
        >
          Price <span className="text-red-500" aria-hidden="true">*</span>
          {isRent && (
            <span className="text-gray-400 font-normal ml-1">/month</span>
          )}
        </label>
        <div className="flex gap-2">
          {/* Currency selector */}
          <Controller
            name="currency"
            render={({ field }) => (
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => field.onChange(c.value)}
                    aria-pressed={field.value === c.value}
                    className={cn(
                      'px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                      field.value === c.value
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            )}
          />

          {/* Price input */}
          <div className="relative flex-1">
            {selectedCurrency && (
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
                aria-hidden="true"
              >
                {selectedCurrency.symbol}
              </span>
            )}
            <input
              id="price"
              type="number"
              min="1"
              step="1"
              aria-required="true"
              aria-describedby={errors.price ? 'price-error' : undefined}
              aria-invalid={errors.price ? 'true' : 'false'}
              {...register('price')}
              placeholder="0"
              className={cn(
                'h-11 w-full border rounded-lg pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.price ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
              )}
            />
          </div>
        </div>
        {errors.price && (
          <p id="price-error" role="alert" className="text-sm text-red-600 mt-1">
            {errors.price.message}
          </p>
        )}
        {errors.currency && (
          <p role="alert" className="text-sm text-red-600 mt-1">
            {errors.currency.message}
          </p>
        )}
      </div>

      {/* Negotiable */}
      <Controller
        name="negotiable"
        render={({ field }) => (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.value ?? false}
              onChange={field.onChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-800 group-hover:text-primary transition-colors">
              Price is negotiable
            </span>
          </label>
        )}
      />

      {/* Rent extras */}
      {isRent && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Rental details</h3>

          {/* Utilities */}
          <Controller
            name="utilitiesIncluded"
            render={({ field }) => (
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={field.value ?? false}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-800 group-hover:text-primary transition-colors">
                  Utilities included in the price
                </span>
              </label>
            )}
          />

          {/* Deposit */}
          <div>
            <label htmlFor="deposit" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Security deposit <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
                aria-hidden="true"
              >
                {selectedCurrency?.symbol}
              </span>
              <input
                id="deposit"
                type="number"
                min="0"
                step="1"
                {...register('deposit')}
                placeholder="0"
                className="h-11 w-full border border-gray-300 rounded-lg pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Min rent term */}
          <div>
            <label
              htmlFor="minRentTermMonths"
              className="text-sm font-medium text-gray-700 mb-1.5 block"
            >
              Minimum rental term{' '}
              <span className="text-gray-400 font-normal">(months, optional)</span>
            </label>
            <input
              id="minRentTermMonths"
              type="number"
              min="1"
              step="1"
              {...register('minRentTermMonths')}
              placeholder="e.g. 3"
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Summary chip */}
      {negotiable && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
          <span className="text-xs font-medium text-amber-800">
            💬 &quot;Negotiable&quot; badge will appear on the listing
          </span>
        </div>
      )}

      {utilitiesIncluded && isRent && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full ml-2">
          <span className="text-xs font-medium text-green-800">✓ Utilities included</span>
        </div>
      )}
    </div>
  )
}
