'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface AttachmentLightboxProps {
  url: string
  onClose: () => void
}

/** Full-screen single-image viewer for a tapped message attachment thumbnail. */
export default function AttachmentLightbox({ url, onClose }: AttachmentLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <div className="relative w-full h-full max-w-3xl max-h-[85vh] m-8" onClick={(e) => e.stopPropagation()}>
        <Image src={url} alt="Attachment" fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  )
}
