'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'
import { PropertyDetailsForm } from './PropertyDetailsForm'
import { EstimateResultCard } from './EstimateResultCard'
import { HomeValueCtaCard } from './HomeValueCtaCard'
import { HomeValueDisclaimer } from './HomeValueDisclaimer'
import { ShareLink } from './ShareLink'
import type { EstimateResponse, GeoSuggestion, MatchedProperty } from '@/lib/home-value/types'
import type { PropertyDetailsFormInput } from '@/lib/home-value/schemas'

type Phase = 'input' | 'checking' | 'details' | 'estimating' | 'result' | 'no-data' | 'error'

/**
 * Client orchestrator for the Input → Details → Result state machine
 * (docs/en/pages/12-home-value.md §0, §4). The hero heading/subtitle stay in
 * the Server Component page shell for fast first paint (SEO); everything
 * interactive — autocomplete, form, result — lives here, matching the
 * mortgage-calculators page's "one client island owns 100% of the
 * interactive state" precedent.
 */
export function HomeValueFlow() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>('input')
  const [geo, setGeo] = useState<GeoSuggestion | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [result, setResult] = useState<EstimateResponse | null>(null)
  const [detailsForEstimate, setDetailsForEstimate] = useState<{ areaM2?: number; propertyType?: string } | null>(
    null,
  )

  const hydratedFromUrl = useRef(false)

  const syncUrl = (next: GeoSuggestion) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lat', String(next.lat))
    params.set('lng', String(next.lng))
    params.set('addr', next.label)
    params.set('city', next.city)
    if (next.district) params.set('district', next.district)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const checkMatchAndProceed = async (selected: GeoSuggestion) => {
    setAddressError(null)
    setPhase('checking')
    try {
      const res = await fetch(`/api/home-value/match?lat=${selected.lat}&lng=${selected.lng}`)
      if (res.ok) {
        const body = (await res.json()) as { matched: boolean; property: MatchedProperty | null }
        if (body.matched && body.property) {
          await requestEstimate(selected, {
            propertyType: body.property.propertyType,
            areaM2: body.property.areaM2,
            rooms: body.property.rooms,
            floor: body.property.floor,
            floorsTotal: body.property.floorsTotal,
            yearBuilt: body.property.yearBuilt,
            condition: body.property.condition,
          })
          return
        }
      }
    } catch {
      // Fall through to the Details form — matching is a nice-to-have shortcut, not required.
    }
    setPhase('details')
  }

  const handleAddressSelected = (selected: GeoSuggestion) => {
    setGeo(selected)
    syncUrl(selected)
    void checkMatchAndProceed(selected)
  }

  const requestEstimate = async (selected: GeoSuggestion, details: PropertyDetailsFormInput) => {
    setPhase('estimating')
    setDetailsForEstimate({ areaM2: details.areaM2, propertyType: details.propertyType })
    try {
      const res = await fetch('/api/home-value/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selected.lat,
          lng: selected.lng,
          city: selected.city,
          district: selected.district,
          addressLabel: selected.label,
          ...details,
        }),
      })

      if (res.status === 422) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        if (body?.error === 'no_area_data') {
          setPhase('no-data')
          return
        }
        setPhase('error')
        return
      }

      if (!res.ok) {
        setPhase('error')
        return
      }

      const body = (await res.json()) as EstimateResponse
      setResult(body)
      setPhase('result')
    } catch {
      setPhase('error')
    }
  }

  // Restore a shareable in-progress flow from ?lat&lng&addr&city&district (docs §3.1).
  useEffect(() => {
    if (hydratedFromUrl.current) return
    hydratedFromUrl.current = true

    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const addr = searchParams.get('addr')
    const city = searchParams.get('city')
    if (lat && lng && addr && city) {
      const restored: GeoSuggestion = {
        label: addr,
        lat: Number(lat),
        lng: Number(lng),
        country: 'AM',
        city,
        district: searchParams.get('district') ?? undefined,
      }
      setGeo(restored)
      void checkMatchAndProceed(restored)
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEstimateClick = () => {
    if (!geo) {
      setAddressError('Select an address from the list')
      return
    }
    void checkMatchAndProceed(geo)
  }

  const handleDetailsSubmit = (data: PropertyDetailsFormInput) => {
    if (!geo) return
    void requestEstimate(geo, data)
  }

  const handleRetry = () => {
    if (geo) void checkMatchAndProceed(geo)
    else setPhase('input')
  }

  return (
    <div className="space-y-6">
      {/* Address input row — always visible except while a result is on screen on mobile-first flows */}
      <div className="flex flex-col sm:flex-row gap-3">
        <AddressAutocomplete onSelect={handleAddressSelected} initialLabel={geo?.label} hasError={!!addressError} />
        <button
          type="button"
          onClick={handleEstimateClick}
          disabled={phase === 'checking' || phase === 'estimating'}
          className="h-14 px-8 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 whitespace-nowrap"
        >
          {phase === 'checking' || phase === 'estimating' ? 'Working…' : 'Estimate'}
        </button>
      </div>
      {addressError && (
        <p role="alert" className="text-sm text-red-600 -mt-3">
          {addressError}
        </p>
      )}

      {phase === 'input' && <HomeValueDisclaimer />}

      {(phase === 'checking' || phase === 'estimating') && (
        <div className="shadow-sm border border-gray-200 rounded-xl p-6 space-y-4" aria-live="polite">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {phase === 'checking' ? 'Looking up this address…' : 'Calculating your estimate…'}
          </div>
          <div className="h-10 w-2/3 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-2 w-full bg-gray-100 animate-pulse rounded-full" />
        </div>
      )}

      {phase === 'details' && geo && (
        <>
          <PropertyDetailsForm addressLabel={geo.label} onSubmit={handleDetailsSubmit} />
        </>
      )}

      {phase === 'no-data' && (
        <div className="shadow-sm border border-gray-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">We can&apos;t value this area yet</h2>
          <p className="text-sm text-gray-500">
            We don&apos;t have enough market data for this location. Try a nearby address, or check back soon.
          </p>
          <HomeValueDisclaimer />
        </div>
      )}

      {phase === 'error' && (
        <div role="alert" className="shadow-sm border border-gray-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Try again
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
          <div className="space-y-6 min-w-0">
            <EstimateResultCard data={result} addressLabel={geo?.label} />
            <ShareLink hash={result.hash} />
          </div>
          <div className="mt-6 lg:mt-0">
            <HomeValueCtaCard
              estimate={result.estimate}
              district={geo?.district}
              areaM2={detailsForEstimate?.areaM2}
              propertyType={detailsForEstimate?.propertyType}
              addressLabel={geo?.label}
            />
          </div>
        </div>
      )}
    </div>
  )
}
