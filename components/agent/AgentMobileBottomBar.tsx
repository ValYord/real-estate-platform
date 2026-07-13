'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Share2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentMobileBottomBarProps {
  agentId: string
  phone: string | null
}

/**
 * Fixed bottom bar shown on mobile — [💬 Message] [📞 Call] [⤴ Share].
 * docs/en/pages/10-agent-profile.md §2 "Mobile".
 */
export default function AgentMobileBottomBar({ agentId, phone }: AgentMobileBottomBarProps) {
  const [msgLoading, setMsgLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const handleMessage = async () => {
    if (msgLoading) return
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message: `Hi, I'm interested in your services.` }),
      })
      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${next}`
        return
      }
      if (res.ok) {
        const data = (await res.json()) as { conversationId: string }
        window.location.href = `/messages/${data.conversationId}`
      }
    } catch {
      // ignore
    } finally {
      setMsgLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-18 flex items-center px-4 gap-3 pb-safe">
      <button
        onClick={() => void handleMessage()}
        disabled={msgLoading}
        className={cn(
          'flex-1 h-12 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          msgLoading && 'opacity-70',
        )}
      >
        {msgLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
        )}
        Message
      </button>

      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="flex-1 h-12 border border-primary text-primary rounded-lg font-medium flex items-center justify-center gap-2 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          Call
        </a>
      )}

      <button
        onClick={() => void handleShare()}
        aria-label="Share"
        className="w-12 h-12 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:border-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
      </button>

      {shareCopied && (
        <span role="status" className="sr-only">
          Link copied
        </span>
      )}
    </div>
  )
}
