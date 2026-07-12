import Image from 'next/image'
import { CheckCircle, Star, MapPin, User } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { SPECIALTY_LABEL, LANGUAGE_LABEL } from '@/lib/agent/constants'
import type { AgentCardData } from '@/lib/agent/types'

interface AgentCardProps {
  agent: AgentCardData
}

const TIER_STYLES: Record<string, string> = {
  pro: 'bg-violet-100 text-violet-700',
  premium: 'bg-amber-100 text-amber-700',
}

/**
 * Agent directory card — docs/en/pages/11-find-agent.md §3.5.
 * Avatar, name, ✓ Verified, rating, city/scope, specialties, active listings.
 * The whole card links to the agent's profile (Page 10).
 */
export function AgentCard({ agent }: AgentCardProps) {
  const initials = agent.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Link
      href={`/agent/${agent.slug}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <article>
        <div className="flex items-start gap-3">
          {agent.avatar ? (
            <Image
              src={agent.avatar}
              alt={agent.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full bg-primary/10 text-primary text-lg font-semibold flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              {initials || <User className="w-6 h-6" />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
              {agent.name}
              {agent.verified && (
                <span
                  title="Verified"
                  className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                >
                  <CheckCircle className="w-3 h-3" aria-hidden="true" />
                  Verified
                </span>
              )}
            </p>
            {agent.agencyName && (
              <p className="text-sm text-gray-500 truncate">{agent.agencyName}</p>
            )}
            <div className="flex items-center gap-1 text-sm mt-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-gray-900 font-medium">{agent.rating.toFixed(1)}</span>
              <span className="text-gray-400">({agent.reviewsCount})</span>
            </div>
          </div>

          {agent.tier !== 'free' && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize flex-shrink-0 ${TIER_STYLES[agent.tier] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {agent.tier}
            </span>
          )}
        </div>

        {agent.scope.length > 0 && (
          <p className="flex items-center gap-1 text-sm text-gray-500 mt-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {agent.scope.join(' · ')}
          </p>
        )}

        {agent.languages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {agent.languages.map((lang) => (
              <span
                key={lang}
                className="bg-gray-50 border border-gray-200 text-xs px-2 py-0.5 rounded text-gray-600"
              >
                {LANGUAGE_LABEL[lang] ?? lang.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {agent.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {agent.specialties.slice(0, 3).map((s) => (
              <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {SPECIALTY_LABEL[s] ?? s}
              </span>
            ))}
            {agent.specialties.length > 3 && (
              <span className="text-xs text-gray-400 self-center">+{agent.specialties.length - 3}</span>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
          {agent.listingsActive} active listing{agent.listingsActive === 1 ? '' : 's'}
        </p>
      </article>
    </Link>
  )
}
