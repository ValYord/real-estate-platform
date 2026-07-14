'use client'

import { useState } from 'react'
import { Facebook, Send, MessageCircle, Link2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareRailProps {
  url: string
  title: string
}

/**
 * Share buttons — sticky left rail on desktop, horizontal row on mobile
 * (docs/en/pages/15-blog.md §3.9).
 */
export default function ShareRail({ url, title }: ShareRailProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const channels = [
    {
      key: 'facebook',
      label: 'Share on Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'telegram',
      label: 'Share on Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'whatsapp',
      label: 'Share on WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      key: 'x',
      label: 'Share on X',
      icon: Send,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'email',
      label: 'Share by email',
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silently ignore, the link is still
      // visible/selectable in the address bar.
    }
  }

  return (
    <div className="flex lg:flex-col gap-2">
      {channels.map(({ key, label, icon: Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link"
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          copied ? 'border-primary text-primary' : 'border-gray-200 text-gray-600 hover:text-primary hover:border-primary',
        )}
      >
        <Link2 className="w-4 h-4" aria-hidden="true" />
      </button>
      {copied && (
        <span role="status" className="text-xs text-primary lg:text-center">
          Link copied
        </span>
      )}
    </div>
  )
}
