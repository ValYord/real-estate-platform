'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageSquare, Phone, Share2, ClipboardList, Star, CheckCircle, User, Loader2 } from 'lucide-react'
import RequestLeadModal from './RequestLeadModal'
import type { AgentProfile } from '@/lib/agent/types'

interface AgentContactCardProps {
  agent: AgentProfile
}

/**
 * Sidebar contact card (desktop) — the conversion core of the profile page.
 * docs/en/pages/10-agent-profile.md §3.7.
 */
export default function AgentContactCard({ agent }: AgentContactCardProps) {
  const [phoneVisible, setPhoneVisible] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const redirectToLogin = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/auth/login?next=${next}`
  }

  const handleSendMessage = async () => {
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: `Hi, I'm interested in your services.`,
        }),
      })
      if (res.status === 401) {
        redirectToLogin()
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
      // ignore — clipboard may be unavailable
    }
  }

  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-5 space-y-5 sticky top-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {agent.avatar ? (
            <Image src={agent.avatar} alt={agent.name} width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-gray-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate flex items-center gap-1">
            {agent.name}
            {agent.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />}
          </p>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" aria-hidden="true" />
            {agent.rating.toFixed(1)} <span className="text-gray-400">({agent.reviewsCount})</span>
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={handleSendMessage}
          disabled={msgLoading}
          className="w-full h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {msgLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          )}
          Send a message
        </button>

        {agent.phone && (
          <button
            onClick={() => setPhoneVisible(true)}
            className="w-full h-12 border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            {phoneVisible ? (
              <a href={`tel:${agent.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>
                {agent.phone}
              </a>
            ) : (
              'Show phone'
            )}
          </button>
        )}

        <button
          onClick={() => setShowRequestModal(true)}
          className="w-full h-12 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ClipboardList className="w-4 h-4" aria-hidden="true" />
          Send a request
        </button>

        <button
          onClick={() => void handleShare()}
          className="w-full h-10 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          {shareCopied ? 'Link copied' : 'Share'}
        </button>
      </div>

      {requestSent ? (
        <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
          Your request has been sent — the agent will get in touch.
        </p>
      ) : (
        <p className="text-xs text-gray-400 text-center">Anti-spam protected. Your data is safe.</p>
      )}

      {showRequestModal && (
        <RequestLeadModal
          agentId={agent.id}
          onClose={() => setShowRequestModal(false)}
          onSent={() => {
            setShowRequestModal(false)
            setRequestSent(true)
          }}
        />
      )}
    </div>
  )
}
