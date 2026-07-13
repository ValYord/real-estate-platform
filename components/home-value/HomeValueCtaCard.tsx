'use client'

import { useState } from 'react'
import { Home as HomeIcon, Tag, Users, Bell, Calculator, Bookmark } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { hasSessionCookie } from '@/lib/auth/hasSessionCookie'
import { HomeValueLoginModal } from './HomeValueLoginModal'

interface HomeValueCtaCardProps {
  estimate: number
  district?: string
  areaM2?: number
  propertyType?: string
  addressLabel?: string
}

type ModalKind = 'claim' | 'save' | 'alerts' | null

/**
 * Sidebar CTA card (docs §3.8) — the lead-gen core of the page.
 * "Claim my home", "Save estimate", and "Get value alerts" require login:
 * guests see a login modal with `?next=` back to this tool; the alerts
 * *delivery* mechanism itself is Page 08 territory (out of scope here — see
 * lib/notifications/*), so a logged-in click on any of the three is
 * intentionally a stub (no fake success state — see HomeValueLoginModal /
 * the "coming soon" status line below).
 * "Sell this property" and "Find an agent" are plain links to existing
 * pages — no new logic.
 */
export function HomeValueCtaCard({
  estimate,
  district,
  areaM2,
  propertyType,
  addressLabel,
}: HomeValueCtaCardProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [modal, setModal] = useState<ModalKind>(null)
  const [confirmedKind, setConfirmedKind] = useState<ModalKind>(null)

  const query = searchParams.toString()
  const redirectTo = `${pathname}${query ? `?${query}` : ''}`

  const sellParams = new URLSearchParams()
  if (addressLabel) sellParams.set('addr', addressLabel)
  if (areaM2) sellParams.set('area', String(areaM2))
  if (propertyType) sellParams.set('type', propertyType)
  const sellHref = `/sell/new${sellParams.toString() ? `?${sellParams.toString()}` : ''}`

  const agentHref = district ? `/agents?district=${encodeURIComponent(district)}` : '/agents'
  const mortgageHref = `/mortgage-calculators?price=${Math.round(estimate)}&currency=AMD`

  const handleGatedClick = (kind: ModalKind) => {
    if (hasSessionCookie()) {
      setConfirmedKind(kind)
    } else {
      setModal(kind)
    }
  }

  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-5 lg:sticky lg:top-20">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">What to do next</h3>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleGatedClick('claim')}
          className="flex items-center justify-center gap-2 bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <HomeIcon className="w-4 h-4" aria-hidden="true" />
          Claim my home
        </button>

        <button
          type="button"
          onClick={() => handleGatedClick('save')}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 h-12 rounded-lg w-full font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          Save estimate
        </button>

        <Link
          href={sellHref as Parameters<typeof Link>[0]['href']}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 h-12 rounded-lg w-full font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Tag className="w-4 h-4" aria-hidden="true" />
          Sell this property
        </Link>

        <Link
          href={agentHref as Parameters<typeof Link>[0]['href']}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 h-12 rounded-lg w-full font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          Find an agent
        </Link>

        <Link
          href={mortgageHref as Parameters<typeof Link>[0]['href']}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 h-12 rounded-lg w-full font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Calculator className="w-4 h-4" aria-hidden="true" />
          Mortgage calculator
        </Link>

        <button
          type="button"
          onClick={() => handleGatedClick('alerts')}
          className="flex items-center justify-center gap-2 text-primary text-sm h-10 rounded-lg w-full font-medium hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="w-3.5 h-3.5" aria-hidden="true" />
          Get value alerts
        </button>
      </div>

      {confirmedKind && (
        <p role="status" className="mt-3 text-xs text-gray-500">
          {confirmedKind === 'claim' && "You're signed in — the claimed-homes dashboard is coming soon."}
          {confirmedKind === 'save' && "You're signed in — saving estimates to your account is coming soon."}
          {confirmedKind === 'alerts' && "You're signed in — value alerts are coming soon."}
        </p>
      )}

      {modal === 'claim' && (
        <HomeValueLoginModal
          title="Sign in to claim your home"
          description="Claiming your home lets you track its estimated value over time."
          redirectTo={redirectTo}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'save' && (
        <HomeValueLoginModal
          title="Sign in to save this estimate"
          description="Save this estimate to your account to find it again later."
          redirectTo={redirectTo}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'alerts' && (
        <HomeValueLoginModal
          title="Sign in for value alerts"
          description="We'll notify you when your home's estimated value changes."
          redirectTo={redirectTo}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
