'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { usePathname } from 'next/navigation'

/**
 * Copies the shareable, read-only `/home-value/[hash]` snapshot link
 * (docs §0 — "after the result, a shareable snapshot"). Client-only (needs
 * `navigator.clipboard` and the current origin).
 */
export function ShareLink({ hash }: { hash: string }) {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)

  // pathname is "/[locale]/home-value[/...]" — swap in the hash as the leaf segment.
  const basePath = pathname.replace(/\/home-value(\/.*)?$/, '/home-value')
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${basePath}/${hash}` : `${basePath}/${hash}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently no-op, link text is still visible below.
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Link2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{shareUrl}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex-shrink-0 inline-flex items-center gap-1 text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Copied
          </>
        ) : (
          'Copy link'
        )}
      </button>
    </div>
  )
}
