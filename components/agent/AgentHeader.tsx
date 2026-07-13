import Image from 'next/image'
import { CheckCircle, MapPin, Star } from 'lucide-react'
import type { AgentProfile } from '@/lib/agent/types'

interface AgentHeaderProps {
  agent: AgentProfile
}

const LANGUAGE_LABEL: Record<string, string> = {
  hy: 'HY',
  ru: 'RU',
  en: 'EN',
}

const TIER_STYLES: Record<string, string> = {
  pro: 'bg-violet-100 text-violet-700',
  premium: 'bg-amber-100 text-amber-700',
}

function yearsInBusiness(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  let years = now.getFullYear() - created.getFullYear()
  if (
    now.getMonth() < created.getMonth() ||
    (now.getMonth() === created.getMonth() && now.getDate() < created.getDate())
  ) {
    years -= 1
  }
  return Math.max(0, years)
}

/** 5-star rating display, filled proportionally to `rating`. */
function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="w-4 h-4 text-amber-500"
          fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}

/**
 * Profile header card — avatar, name, ✓ Verified, agency, rating, years
 * active, scope, language chips, tier/Top Agent badges.
 * Server Component — no interactivity needed (docs/en/pages/10 §3.2).
 */
export default function AgentHeader({ agent }: AgentHeaderProps) {
  const initials = agent.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const years = yearsInBusiness(agent.createdAt)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {agent.avatar ? (
          <Image
            src={agent.avatar}
            alt={`${agent.name} — real estate agent`}
            width={96}
            height={96}
            className="w-24 h-24 md:w-24 md:h-24 rounded-full ring-2 ring-white shadow-md object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-2 ring-white shadow-md bg-primary/10 text-primary text-2xl font-semibold flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            {initials || 'A'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name + Verified */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{agent.name}</h1>
            {agent.verified ? (
              <span
                title="Identity and license verified"
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md"
              >
                <CheckCircle className="w-3 h-3" aria-hidden="true" />
                Verified
              </span>
            ) : agent.tier !== 'free' ? (
              <span className="inline-flex items-center bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md">
                Verification in progress
              </span>
            ) : null}
          </div>

          {/* Agency (link out of scope for MVP — /agency/[slug] is a future page) */}
          {agent.agencyName && (
            <p className="text-base text-gray-500 mt-0.5">{agent.agencyName}</p>
          )}

          {/* Rating + years */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <a href="#reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <RatingStars rating={agent.rating} />
              <span className="text-gray-900 font-medium">{agent.rating.toFixed(1)}</span>
              <span className="text-gray-400">({agent.reviewsCount} reviews)</span>
            </a>
            {years > 0 && <span className="text-gray-500">· {years} years in business</span>}
          </div>

          {/* Scope */}
          {agent.scope.length > 0 && (
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              {agent.scope.join(' · ')}
            </p>
          )}

          {/* Language chips */}
          {agent.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {agent.languages.map((lang) => (
                <span
                  key={lang}
                  className="bg-gray-50 border border-gray-200 text-sm px-2 py-0.5 rounded text-gray-600"
                >
                  {LANGUAGE_LABEL[lang] ?? lang.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Badges */}
          {(agent.tier !== 'free' || agent.badges.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.tier !== 'free' && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-md capitalize ${TIER_STYLES[agent.tier] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {agent.tier}
                </span>
              )}
              {agent.badges.includes('top_agent') && (
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-md">
                  Top Agent
                </span>
              )}
              {agent.badges.includes('fast_responder') && (
                <span className="text-xs font-medium bg-sky-100 text-sky-700 px-2 py-1 rounded-md">
                  Fast responder
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
