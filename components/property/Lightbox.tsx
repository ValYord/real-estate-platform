'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyMedia } from '@/lib/property/types'

interface LightboxProps {
  photos: PropertyMedia[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  title?: string
}

/**
 * Full-screen lightbox for photo browsing.
 * Loaded lazily via dynamic() to keep it out of the initial bundle.
 */
export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  title,
}: LightboxProps) {
  const total = photos.length
  const current = photos[currentIndex]

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % total)
  }, [currentIndex, total, onNavigate])

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + total) % total)
  }, [currentIndex, total, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-white text-sm font-medium">
          {currentIndex + 1} / {total}
        </p>
        <button
          onClick={onClose}
          aria-label="Close gallery"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Main image */}
      <div className="relative flex-1 flex items-center justify-center px-12 min-h-0">
        <button
          onClick={goPrev}
          aria-label="Previous photo"
          className="absolute left-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>

        <div className="relative w-full h-full">
          <Image
            src={current.url}
            alt={title ? `${title} — photo ${currentIndex + 1}` : `Photo ${currentIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        <button
          onClick={goNext}
          aria-label="Next photo"
          className="absolute right-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
        >
          <ChevronRight className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="flex-shrink-0 py-3 px-4 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => onNavigate(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  'relative w-14 h-10 rounded overflow-hidden flex-shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  i === currentIndex
                    ? 'ring-2 ring-white opacity-100'
                    : 'opacity-50 hover:opacity-80',
                )}
              >
                <Image
                  src={photo.url}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
