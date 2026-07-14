'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * The only interactive piece of AdminTopBar. Mirrors
 * DashboardSidebar.handleSignOut's call shape, minus the `?signed_out=1`
 * toast hookup (that toast lives on the public site's chrome, which /admin
 * intentionally doesn't render — see ConditionalChrome.tsx).
 */
export default function AdminSignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleSignOut}
      aria-label="Sign out"
      className="p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <LogOut aria-hidden="true" className="w-4 h-4" />
    </button>
  )
}
