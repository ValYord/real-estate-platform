import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import MessagesShell from '@/components/messages/MessagesShell'

export const metadata: Metadata = {
  title: 'Messages | RE Platform',
  // Personal, auth-gated inbox — never indexed.
  robots: { index: false, follow: false },
}

/**
 * Auth-gated SSR shell for Page 09 (Messages / Inbox).
 *
 * `/messages` is already listed in PROTECTED_PATHS (lib/auth/protectedPaths.ts)
 * so the middleware redirects guests before this ever renders; the check
 * below is defense in depth per the CLAUDE.md auth rule (protected routes
 * verify the session server-side too).
 *
 * Renders <MessagesShell>, a client component that owns the desktop
 * two-pane / mobile single-pane layout switch and the conversation list.
 * `children` is either the "select a conversation" placeholder
 * (app/[locale]/messages/page.tsx) or the thread (.../[conversationId]/page.tsx).
 */
export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/messages')
  }

  return <MessagesShell>{children}</MessagesShell>
}
