import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export const metadata: Metadata = {
  title: 'Personal panel — RE Platform',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/dashboard')
  }

  // Fetch profile for role and initial badge counts
  type ProfileRow = {
    role: 'user' | 'agent' | 'admin'
    agent_slug: string | null
    phone_verified: boolean
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, agent_slug, phone_verified')
    .eq('id', user.id)
    .single()

  const userProfile = profile as ProfileRow | null
  const userRole = userProfile?.role ?? 'user'

  // Initial unread counts (the sidebar realtime will keep these updated)
  const { count: initialUnread } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .not('sender_id', 'eq', user.id)

  const { count: initialNotifications } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar
        userId={user.id}
        userRole={userRole}
        initialUnread={initialUnread ?? 0}
        initialNotifications={initialNotifications ?? 0}
      />
      <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  )
}
