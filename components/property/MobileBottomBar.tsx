'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Heart, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomBarProps {
  propertyId: string
  phone: string | null
  isFavorited?: boolean
  isAvailable?: boolean
}

/**
 * Fixed bottom bar shown on mobile.
 * Contains [💬 Message] [📞 Call] [♡ Favorite] buttons.
 */
export default function MobileBottomBar({
  propertyId,
  phone,
  isFavorited = false,
  isAvailable = true,
}: MobileBottomBarProps) {
  const [fav, setFav] = useState(isFavorited)
  const [favLoading, setFavLoading] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)

  const handleFav = async () => {
    if (favLoading) return
    const next = !fav
    setFav(next)
    setFavLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.status === 401) {
        setFav(!next)
        const next_ = encodeURIComponent(window.location.pathname)
        window.location.href = `/auth/login?next=${next_}`
      } else if (!res.ok) {
        setFav(!next)
      }
    } catch {
      setFav(!next)
    } finally {
      setFavLoading(false)
    }
  }

  const handleMessage = async () => {
    if (msgLoading || !isAvailable) return
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          message: `Hi, I am interested in this property (#${propertyId}).`,
        }),
      })
      if (res.status === 401) {
        const nextUrl = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${nextUrl}`
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-18 flex items-center px-4 gap-3 pb-safe">
      <button
        onClick={handleMessage}
        disabled={msgLoading || !isAvailable}
        className={cn(
          'flex-1 h-12 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          (!isAvailable || msgLoading) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {msgLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
        )}
        Message
      </button>

      {phone && isAvailable && (
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className={cn(
            'flex-1 h-12 border border-primary text-primary rounded-lg font-medium flex items-center justify-center gap-2 transition-colors hover:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          Call
        </a>
      )}

      <button
        onClick={handleFav}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={fav}
        className={cn(
          'w-12 h-12 border rounded-lg flex items-center justify-center transition-colors',
          fav
            ? 'border-red-200 bg-red-50 text-red-500'
            : 'border-gray-200 text-gray-600 hover:border-gray-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
      >
        {favLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="w-4 h-4" aria-hidden="true" fill={fav ? 'currentColor' : 'none'} />
        )}
      </button>
    </div>
  )
}
