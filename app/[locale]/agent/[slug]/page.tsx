import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import AgentHeader from '@/components/agent/AgentHeader'
import AgentBio from '@/components/agent/AgentBio'
import AgentStats from '@/components/agent/AgentStats'
import AgentListings from '@/components/agent/AgentListings'
import AgentReviews from '@/components/agent/AgentReviews'
import AgentContactCard from '@/components/agent/AgentContactCard'
import AgentOwnerManageBar from '@/components/agent/AgentOwnerManageBar'
import AgentMobileBottomBar from '@/components/agent/AgentMobileBottomBar'
import OtherAgents from '@/components/agent/OtherAgents'
import type { AgentProfile } from '@/lib/agent/types'

type PageParams = { locale: string; slug: string }

const BRAND = 'RE Platform'

interface AgentFetchResult {
  agent: AgentProfile | null
  status: 200 | 404 | 410
}

/**
 * Fetch the agent profile from the internal API (Supabase-backed, mock
 * fallback). Uses cache: 'no-store' so isOwner/rating stay fresh, mirroring
 * app/[locale]/property/[id]/[slug]/page.tsx.
 */
async function fetchAgent(slug: string): Promise<AgentFetchResult> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/agents/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.status === 404) return { agent: null, status: 404 }
    if (res.status === 410) return { agent: null, status: 410 }
    if (!res.ok) return { agent: null, status: 404 }
    const agent = (await res.json()) as AgentProfile
    return { agent, status: 200 }
  } catch {
    return { agent: null, status: 404 }
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)
  const { agent, status } = await fetchAgent(slug)

  if (status === 404 || !agent) {
    return { title: `Agent not found | ${BRAND}` }
  }

  if (status === 410) {
    return {
      title: `Profile unavailable | ${BRAND}`,
      robots: { index: false, follow: false },
    }
  }

  const bio = agent.bio[locale] ?? agent.bio.en ?? agent.bio.hy ?? agent.bio.ru ?? ''
  const city = agent.scope[0]
  const description =
    `${bio.slice(0, 155)} · ${agent.stats.listingsActive ?? 0} active listings · ${agent.reviewsCount} reviews`.trim()

  const canonical = `/${locale}/agent/${agent.slug}`
  const alternates: Record<string, string> = {
    hy: `/hy/agent/${agent.slug}`,
    ru: `/ru/agent/${agent.slug}`,
    en: `/en/agent/${agent.slug}`,
  }

  return {
    title: `${agent.name} — real estate agent${city ? ` in ${city}` : ''} · ⭐ ${agent.rating.toFixed(1)} | ${BRAND}`,
    description,
    alternates: { canonical, languages: alternates },
    openGraph: {
      title: `${agent.name} — real estate agent${city ? ` in ${city}` : ''}`,
      description,
      type: 'profile',
    },
  }
}

/** "This profile is no longer available" state — docs/en/pages/10 §4 (suspended). */
function SuspendedState() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-8" aria-hidden="true">
        <Users className="w-14 h-14 text-gray-300" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-3">This profile is no longer available</h1>
      <p className="text-gray-500 mb-8">The agent may have deactivated their account.</p>
      <Link
        href="/agents"
        className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Users className="w-4 h-4" aria-hidden="true" />
        Find an Agent
      </Link>
    </main>
  )
}

export default async function AgentProfilePage({ params }: { params: Promise<PageParams> }) {
  const { slug, locale: rawLocale } = await params
  const bioLocale = safeLocale(rawLocale)
  const { agent, status } = await fetchAgent(slug)

  if (status === 404 || !agent) notFound()
  if (status === 410) return <SuspendedState />

  const city = agent.scope[0] ?? null
  const bio = agent.bio[bioLocale] ?? agent.bio.en ?? agent.bio.hy ?? agent.bio.ru ?? ''

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Find an Agent', href: '/agents' },
    ...(city ? [{ label: city, href: `/agents?city=${encodeURIComponent(city)}` }] : []),
    { label: agent.name },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateAgent',
        name: agent.name,
        image: agent.avatar ?? undefined,
        url: `https://example.com/agent/${agent.slug}`,
        ...(agent.reviewsCount > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: agent.rating,
                reviewCount: agent.reviewsCount,
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.label,
          ...(crumb.href ? { item: `https://example.com${crumb.href}` } : {}),
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-7xl mx-auto px-4 pb-24 lg:pb-12">
        <Breadcrumbs items={breadcrumbs} className="py-3" />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* Main column */}
          <div className="min-w-0">
            <AgentHeader agent={agent} />
            <AgentBio text={bio} specialties={agent.specialties} isOwner={agent.isOwner} />
            <AgentStats agent={agent} />
            <AgentListings agentId={agent.id} />
            <AgentReviews agentId={agent.id} isOwner={agent.isOwner} />

            {/* Contact / manage bar inline on mobile & tablet */}
            <div className="lg:hidden mt-6">
              {agent.isOwner ? <AgentOwnerManageBar /> : <AgentContactCard agent={agent} />}
            </div>
          </div>

          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            {agent.isOwner ? <AgentOwnerManageBar /> : <AgentContactCard agent={agent} />}
          </aside>
        </div>

        <OtherAgents city={city} excludeAgentId={agent.id} />
      </main>

      {!agent.isOwner && <AgentMobileBottomBar agentId={agent.id} phone={agent.phone} />}
    </>
  )
}
