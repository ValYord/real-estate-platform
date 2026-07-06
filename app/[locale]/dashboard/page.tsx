import type { Metadata } from 'next'
import { Suspense } from 'react'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import OverviewCards from '@/components/dashboard/OverviewCards'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentActivity from '@/components/dashboard/RecentActivity'

export const metadata: Metadata = {
  title: 'Personal panel — RE Platform',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/dashboard')
  }

  type ProfileRow = {
    full_name: string | null
    avatar_url: string | null
    role: 'user' | 'agent' | 'admin'
    agent_slug: string | null
    phone_verified: boolean
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role, agent_slug, phone_verified')
    .eq('id', user.id)
    .single()

  const userProfile = profile as ProfileRow | null
  const name = userProfile?.full_name ?? user.email ?? 'User'
  const avatarUrl = userProfile?.avatar_url
  const role = userProfile?.role ?? 'user'
  const phoneVerified = userProfile?.phone_verified ?? true

  // Active listing count for the quick actions limit check
  const { count: activeListingCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'active')

  return (
    <div className="space-y-8 pt-8 lg:pt-0">
      {/* Phone unverified banner */}
      {!phoneVerified && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
          <span aria-hidden="true">⚠️</span>
          <span className="text-yellow-800 flex-1">
            Verify your phone to post a listing
          </span>
          <Link
            href="/auth/verify"
            className="text-yellow-700 font-medium underline hover:text-yellow-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 rounded"
          >
            Verify
          </Link>
        </div>
      )}

      {/* Greeting header */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Hi, {name} 👋
          </h1>
        </div>

        {/* Role badge */}
        {role === 'user' && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
            User
          </span>
        )}
        {role === 'agent' && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">
            Agent ✓
          </span>
        )}
        {role === 'admin' && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">
            Admin
          </span>
        )}
      </div>

      {/* Overview cards */}
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">Overview</h2>
        <OverviewCards userRole={role} agentSlug={userProfile?.agent_slug} />
      </section>

      {/* Quick actions */}
      <QuickActions listingCount={activeListingCount ?? 0} />

      {/* Recent activity */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-lg font-semibold text-gray-900 mb-4">
          Recent activity
        </h2>
        <Suspense fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        }>
          <RecentActivity />
        </Suspense>
      </section>
    </div>
  )
}
