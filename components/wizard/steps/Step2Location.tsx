'use client'

import { useFormContext, Controller } from 'react-hook-form'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { WizardFormData } from '@/lib/listings/types'

// Dynamically import the map to avoid SSR issues with mapbox-gl
const DraggablePinMap = dynamic(() => import('@/components/wizard/DraggablePinMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-xl bg-gray-100 animate-pulse border border-gray-200" />
  ),
})

const COUNTRIES = [
  { code: 'AM', label: 'Armenia' },
  { code: 'RU', label: 'Russia' },
  { code: 'US', label: 'United States' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
]

const ARMENIAN_CITIES = [
  'Yerevan', 'Gyumri', 'Vanadzor', 'Vagharshapat', 'Hrazdan',
  'Abovyan', 'Kapan', 'Gavar', 'Artashat', 'Ijevan',
]

export default function Step2Location() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormData>()

  const lat = watch('lat')
  const lng = watch('lng')
  const country = watch('country')

  const handlePinMove = (newLat: number, newLng: number) => {
    setValue('lat', newLat, { shouldValidate: true })
    setValue('lng', newLng, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" tabIndex={-1}>
          Where is the property?
        </h2>
        <p className="text-gray-500 mt-1">Set the location so buyers can find it.</p>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="text-sm font-medium text-gray-700 mb-1.5 block">
          Country
        </label>
        <select
          id="country"
          {...register('country')}
          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="text-sm font-medium text-gray-700 mb-1.5 block">
          City <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="city"
          type="text"
          list={country === 'AM' ? 'am-cities' : undefined}
          aria-required="true"
          aria-describedby={errors.city ? 'city-error' : undefined}
          aria-invalid={errors.city ? 'true' : 'false'}
          {...register('city')}
          placeholder="e.g. Yerevan"
          className={cn(
            'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
            errors.city ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
          )}
        />
        {country === 'AM' && (
          <datalist id="am-cities">
            {ARMENIAN_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        )}
        {errors.city && (
          <p id="city-error" role="alert" className="text-sm text-red-600 mt-1">
            {errors.city.message}
          </p>
        )}
      </div>

      {/* District */}
      <div>
        <label htmlFor="district" className="text-sm font-medium text-gray-700 mb-1.5 block">
          District / Neighbourhood
        </label>
        <input
          id="district"
          type="text"
          {...register('district')}
          placeholder="e.g. Arabkir"
          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1.5 block">
          Street address
        </label>
        <input
          id="address"
          type="text"
          {...register('address')}
          placeholder="e.g. Baghramyan 24"
          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Building / Apt */}
      <div>
        <label htmlFor="buildingApt" className="text-sm font-medium text-gray-700 mb-1.5 block">
          Building / Apt № <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="buildingApt"
          type="text"
          {...register('buildingApt')}
          placeholder="e.g. Apt 42"
          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Map */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1.5">
          Map pin <span className="text-red-500" aria-hidden="true">*</span>
        </p>
        <DraggablePinMap
          lat={lat}
          lng={lng}
          onMove={handlePinMove}
          className="h-[300px] md:h-[300px] sm:h-[240px]"
        />
        {(errors.lat ?? errors.lng) && (
          <p role="alert" className="text-sm text-red-600 mt-1.5">
            Please drag the pin to the property location.
          </p>
        )}
      </div>

      {/* Hide exact address */}
      <Controller
        name="hideExact"
        render={({ field }) => (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.value}
              onChange={field.onChange}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>
              <span className="text-sm font-medium text-gray-800 group-hover:text-primary transition-colors">
                Hide exact address
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Show district only — the exact pin will not be visible to visitors.
              </span>
            </span>
          </label>
        )}
      />
    </div>
  )
}
