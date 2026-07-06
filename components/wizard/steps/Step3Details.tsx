'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { WizardFormData } from '@/lib/listings/types'

const CONDITIONS = [
  { value: 'new', label: 'New development' },
  { value: 'renovated', label: 'Renovated' },
  { value: 'good', label: 'Good' },
  { value: 'needs_renovation', label: 'Needs renovation' },
] as const

const AMENITIES = [
  'Furniture', 'Air conditioning', 'Security', 'Internet',
  'Storage', 'Swimming pool', 'Gym', 'Playground',
  'Concierge', 'CCTV', 'Generator', 'Solar panels',
]

type LangTab = 'hy' | 'ru' | 'en'

const LANG_TABS: { key: LangTab; label: string; required: boolean }[] = [
  { key: 'hy', label: 'HY', required: true },
  { key: 'ru', label: 'RU', required: false },
  { key: 'en', label: 'EN', required: false },
]

export default function Step3Details() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormData>()

  const [activeLang, setActiveLang] = useState<LangTab>('hy')

  const propertyType = watch('propertyType')
  const amenities = watch('amenities') ?? []
  const titleHy = watch('title.hy') ?? ''
  const titleRu = watch('title.ru') ?? ''
  const titleEn = watch('title.en') ?? ''
  const descHy = watch('description.hy') ?? ''
  const descRu = watch('description.ru') ?? ''
  const descEn = watch('description.en') ?? ''

  const isLand = propertyType === 'land'
  const isGarage = propertyType === 'garage'
  const isCommercial = propertyType === 'commercial'
  const hideRooms = isLand || isGarage
  const hideBedrooms = isLand || isGarage
  const hideFloor = isLand

  const langFilled: Record<LangTab, boolean> = {
    hy: titleHy.length >= 5 && descHy.length >= 30,
    ru: titleRu.length > 0 || descRu.length > 0,
    en: titleEn.length > 0 || descEn.length > 0,
  }

  const titleValue = activeLang === 'hy' ? titleHy : activeLang === 'ru' ? titleRu : titleEn
  const descValue = activeLang === 'hy' ? descHy : activeLang === 'ru' ? descRu : descEn
  const titleKey = `title.${activeLang}` as `title.${LangTab}`
  const descKey = `description.${activeLang}` as `description.${LangTab}`

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setValue('amenities', amenities.filter((a) => a !== amenity), { shouldValidate: true })
    } else {
      setValue('amenities', [...amenities, amenity], { shouldValidate: true })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" tabIndex={-1}>
          Property details
        </h2>
        <p className="text-gray-500 mt-1">Tell buyers about the key features.</p>
      </div>

      {/* Area */}
      <div>
        <label htmlFor="areaM2" className="text-sm font-medium text-gray-700 mb-1.5 block">
          Area (m²) <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="areaM2"
          type="number"
          min="1"
          step="0.1"
          aria-required="true"
          aria-describedby={errors.areaM2 ? 'areaM2-error' : undefined}
          aria-invalid={errors.areaM2 ? 'true' : 'false'}
          {...register('areaM2')}
          className={cn(
            'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
            errors.areaM2 ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
          )}
        />
        {errors.areaM2 && (
          <p id="areaM2-error" role="alert" className="text-sm text-red-600 mt-1">
            {errors.areaM2.message}
          </p>
        )}
      </div>

      {/* Numeric fields grid */}
      <div className={cn('grid gap-4', 'grid-cols-2 md:grid-cols-3')}>
        {!hideRooms && (
          <div>
            <label htmlFor="rooms" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Rooms
            </label>
            <input
              id="rooms"
              type="number"
              min="0"
              {...register('rooms')}
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {!hideBedrooms && (
          <div>
            <label htmlFor="bedrooms" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Bedrooms
            </label>
            <input
              id="bedrooms"
              type="number"
              min="0"
              {...register('bedrooms')}
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div>
          <label htmlFor="bathrooms" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Bathrooms
          </label>
          <input
            id="bathrooms"
            type="number"
            min="0"
            {...register('bathrooms')}
            className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {!hideFloor && (
          <>
            <div>
              <label htmlFor="floor" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Floor
              </label>
              <input
                id="floor"
                type="number"
                {...register('floor')}
                className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="floorsTotal" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Floors total
              </label>
              <input
                id="floorsTotal"
                type="number"
                min="1"
                {...register('floorsTotal')}
                className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {!isCommercial && (
          <div>
            <label htmlFor="yearBuilt" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Year built
            </label>
            <input
              id="yearBuilt"
              type="number"
              min="1800"
              max="2100"
              {...register('yearBuilt')}
              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Condition */}
      <div>
        <label htmlFor="condition" className="text-sm font-medium text-gray-700 mb-1.5 block">
          Condition
        </label>
        <select
          id="condition"
          {...register('condition')}
          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          <option value="">— Select —</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Toggle chips */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Features</p>
        <div className="flex flex-wrap gap-2">
          {(['heating', 'balcony', 'parking', 'elevator'] as const).map((field) => {
            const checked = watch(field) ?? false
            return (
              <Controller
                key={field}
                name={field}
                render={({ field: f }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    onClick={() => f.onChange(!checked)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      checked
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary',
                    )}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </button>
                )}
              />
            )
          })}
        </div>
      </div>

      {/* Amenities grid */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Amenities</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AMENITIES.map((amenity) => {
            const checked = amenities.includes(amenity)
            return (
              <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAmenity(amenity)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 group-hover:text-primary transition-colors">
                  {amenity}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Title + Description with language tabs */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Title &amp; Description{' '}
            <span className="text-red-500" aria-hidden="true">*</span>
          </p>

          {/* Language tabs */}
          <div
            className="flex gap-1 mb-4 overflow-x-auto"
            role="tablist"
            aria-label="Language"
          >
            {LANG_TABS.map(({ key, label, required }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeLang === key}
                onClick={() => setActiveLang(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap',
                  activeLang === key
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 text-gray-700 hover:border-primary',
                )}
              >
                {label}
                {required && <span className="text-red-400 text-xs" aria-hidden="true">*</span>}
                {langFilled[key] && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
                    aria-label="filled"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Title input */}
          <div className="mb-3">
            <label
              htmlFor={`title-${activeLang}`}
              className="text-sm font-medium text-gray-700 mb-1.5 block"
            >
              Title ({activeLang.toUpperCase()})
              {activeLang === 'hy' && (
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              )}
            </label>
            <input
              id={`title-${activeLang}`}
              type="text"
              key={titleKey}
              defaultValue={titleValue}
              aria-required={activeLang === 'hy' ? 'true' : 'false'}
              aria-describedby={errors.title?.hy && activeLang === 'hy' ? 'title-hy-error' : undefined}
              aria-invalid={errors.title?.hy && activeLang === 'hy' ? 'true' : 'false'}
              {...register(titleKey)}
              placeholder="e.g. 2-room apartment in Arabkir with great views"
              maxLength={120}
              className={cn(
                'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.title?.hy && activeLang === 'hy'
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300',
              )}
            />
            <div className="flex justify-between mt-1">
              {errors.title?.hy && activeLang === 'hy' ? (
                <p id="title-hy-error" role="alert" className="text-sm text-red-600">
                  {errors.title.hy.message}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{titleValue.length}/120</span>
            </div>
          </div>

          {/* Description textarea */}
          <div>
            <label
              htmlFor={`desc-${activeLang}`}
              className="text-sm font-medium text-gray-700 mb-1.5 block"
            >
              Description ({activeLang.toUpperCase()})
              {activeLang === 'hy' && (
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              )}
            </label>
            <textarea
              id={`desc-${activeLang}`}
              key={descKey}
              defaultValue={descValue}
              aria-required={activeLang === 'hy' ? 'true' : 'false'}
              aria-describedby={errors.description?.hy && activeLang === 'hy' ? 'desc-hy-error' : undefined}
              aria-invalid={errors.description?.hy && activeLang === 'hy' ? 'true' : 'false'}
              {...register(descKey)}
              rows={6}
              maxLength={5000}
              placeholder="Describe the property: renovation, location, infrastructure…"
              className={cn(
                'w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm',
                errors.description?.hy && activeLang === 'hy'
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300',
              )}
            />
            <div className="flex justify-between mt-1">
              {errors.description?.hy && activeLang === 'hy' ? (
                <p id="desc-hy-error" role="alert" className="text-sm text-red-600">
                  {errors.description.hy.message}
                </p>
              ) : (
                <span className="text-xs text-gray-400">Min 30 characters</span>
              )}
              <span className="text-xs text-gray-400">{descValue.length}/5000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
