import Thread from '@/components/messages/Thread'

type Params = Promise<{ conversationId: string }>

/**
 * `/messages/[conversationId]` — right-pane content: the active thread.
 * `<Thread>` is a client component (Realtime subscription, optimistic send).
 */
export default async function ConversationPage({ params }: { params: Params }) {
  const { conversationId } = await params
  return <Thread conversationId={conversationId} />
}
