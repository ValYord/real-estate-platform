import { createServerClient } from '@/lib/supabase/server'
import NoThreadSelected from '@/components/messages/NoThreadSelected'
import EmptyInbox from '@/components/messages/EmptyInbox'

/**
 * `/messages` index — right-pane content when no thread is selected.
 *
 * Desktop: shows either the empty-inbox CTA (zero conversations) or a
 * "Select a conversation on the left" placeholder.
 * Mobile: hidden entirely by <MessagesShell> in favor of the list pane,
 * except when the inbox is genuinely empty (nothing to list either).
 */
export default async function MessagesIndexPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasAny = false
  if (user) {
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    hasAny = (count ?? 0) > 0
  }

  if (!hasAny) {
    return <EmptyInbox />
  }

  return <NoThreadSelected />
}
