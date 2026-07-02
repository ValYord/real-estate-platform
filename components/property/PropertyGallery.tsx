'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  Heart,
  Share2,
  Flag,
  Camera,
  Video,
  Globe,
  Map,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyMedia } from '@/lib/property/types'

// Lazy-load the full-screen lightbox — never SSR'd
const Lightbox = dynamic(() => import('./Lightbox'), { ssr: false })

interface PropertyGalleryProps {
  media: PropertyMedia[]
  title: string
  city: string
  propertyId: string
  isFavorited?: boolean
  isAvailable?: boolean
}

type MediaTab = 'photo' | 'video' | 'tour360' | 'map' | 'floorplan'

const TABS: { key: MediaTab; label: string; Icon: React.ElementType }[] = [
  { key: 'photo', label: 'Photos', Icon: Camera },
  { key: 'video', label: 'Video', Icon: Video },
  { key: 'tour360', label: '360°', Icon: Globe },
  { key: 'map', label: 'Map', Icon: Map },
  { key: 'floorplan', label: 'Floor plan', Icon: LayoutGrid },
]

type ShareChannel = 'copy' | 'telegram' | 'whatsapp' | 'email'

const REPORT_REASONS = [
  { value: 'fake', label: 'Fake listing' },
  { value: 'sold', label: 'Already sold' },
  { value: 'incorrect', label: 'Incorrect information' },
  { value: 'spam', label: 'Spam' },
]

/**
 * Property photo gallery.
 * Desktop: 1 large + 2×2 grid (h-[480px]).
 * Mobile: full-bleed swipe carousel (h-[280px]).
 * Overlay buttons: ♡ Save, ⤴ Share, ⚑ Report.
 * Clicking the main photo opens the Lightbox.
 */
export default function PropertyGallery({
  media,
  title,
  city,
  propertyId,
  isFavorited = false,
  isAvailable = true,
}: PropertyGalleryProps) {
  const photos = media.filter((m) => m.type === 'photo')
  const hasVideo = media.some((m) => m.type === 'video')
  const hasTour360 = media.some((m) => m.type === 'tour360')
  const hasFloorplan = media.some((m) => m.type === 'floorplan')

  const [activeTab, setActiveTab] = useState<MediaTab>('photo')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Favorite state (optimistic)
  const [fav, setFav] = useState(isFavorited)
  const [favLoading, setFavLoading] = useState(false)
  const [favToast, setFavToast] = useState<'added' | 'removed' | null>(null)

  // Share modal
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Report modal
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportNote, setReportNote] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Favorite toggle ────────────────────────────────────────────────────────
  const handleFavToggle = useCallback(async () => {
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
        // Revert and redirect to login
        setFav(!next)
        const currentPath = window.location.pathname
        window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`
        return
      }

      if (!res.ok) {
        setFav(!next)
        return
      }

      // Show toast
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setFavToast(next ? 'added' : 'removed')
      toastTimer.current = setTimeout(() => setFavToast(null), 3000)
    } catch {
      setFav(!next)
    } finally {
      setFavLoading(false)
    }
  }, [fav, favLoading, propertyId])

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = (channel: ShareChannel) => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (channel === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else if (channel === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank')
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank')
    } else if (channel === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const handleReportSubmit = async () => {
    if (!reportReason || reportSubmitting) return
    setReportSubmitting(true)
    try {
      await fetch(`/api/properties/${propertyId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, note: reportNote }),
      })
      setReportDone(true)
      setTimeout(() => {
        setReportOpen(false)
        setReportDone(false)
        setReportReason('')
        setReportNote('')
      }, 2000)
    } catch {
      // ignore
    } finally {
      setReportSubmitting(false)
    }
  }

  // ── Carousel navigation (mobile) ───────────────────────────────────────────
  const carouselPrev = () => setCarouselIndex((i) => (i - 1 + photos.length) % photos.length)
  const carouselNext = () => setCarouselIndex((i) => (i + 1) % photos.length)

  const mainPhoto = photos[0]
  const gridPhotos = photos.slice(1, 5)
  const extraCount = photos.length > 5 ? photos.length - 5 : 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Desktop gallery grid ── */}
      <div className="hidden md:block relative">
        {photos.length === 0 ? (
          <div className="h-[480px] bg-gray-100 rounded-xl flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-300" aria-hidden="true" />
            <p className="ml-3 text-gray-400">No photos available</p>
          </div>
        ) : photos.length === 1 ? (
          <button
            onClick={() => setLightboxIndex(0)}
            className="block w-full h-[420px] relative rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Open photo gallery`}
          >
            <Image
              src={mainPhoto.url}
              alt={`${title} — ${city}, photo 1`}
              fill
              sizes="(max-width: 1280px) 100vw, 760px"
              className="object-cover"
              priority
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold uppercase tracking-wider">
                  No longer available
                </span>
              </div>
            )}
          </button>
        ) : (
          <div className="h-[480px] rounded-xl overflow-hidden grid grid-cols-[3fr_2fr] gap-2">
            {/* Large left photo */}
            <button
              onClick={() => setLightboxIndex(0)}
              className="relative h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              aria-label="Open photo gallery"
            >
              <Image
                src={mainPhoto.url}
                alt={`${title} — ${city}, photo 1`}
                fill
                sizes="(max-width: 1280px) 60vw, 456px"
                className="object-cover"
                priority
              />
              {!isAvailable && (
                <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold uppercase tracking-wider">
                    No longer available
                  </span>
                </div>
              )}
            </button>

            {/* 2×2 right grid */}
            <div className="grid grid-rows-2 grid-cols-2 gap-2 h-full">
              {gridPhotos.map((photo, idx) => {
                const photoIdx = idx + 1
                const isLast = idx === 3 && extraCount > 0
                return (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(photoIdx)}
                    className="relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={`Photo ${photoIdx + 1}`}
                  >
                    <Image
                      src={photo.url}
                      alt={`${title} — ${city}, photo ${photoIdx + 1}`}
                      fill
                      sizes="(max-width: 1280px) 20vw, 152px"
                      className="object-cover"
                    />
                    {isLast && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          +{extraCount + 1} photos
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Overlay buttons (top-right) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleFavToggle}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={fav}
            className={cn(
              'w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              fav ? 'text-red-500' : 'text-gray-700',
            )}
          >
            {favLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Heart
                className="w-5 h-5"
                aria-hidden="true"
                fill={fav ? 'currentColor' : 'none'}
              />
            )}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share property"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow text-gray-700 hover:scale-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Report this listing"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow text-gray-700 hover:scale-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Flag className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Mobile swipe carousel ── */}
      <div className="md:hidden relative h-[280px] bg-gray-100 overflow-hidden">
        {photos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Camera className="w-10 h-10 text-gray-300" aria-hidden="true" />
          </div>
        ) : (
          <>
            <Image
              src={photos[carouselIndex].url}
              alt={`${title} — ${city}, photo ${carouselIndex + 1}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority={carouselIndex === 0}
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white text-lg font-bold uppercase tracking-wider">
                  No longer available
                </span>
              </div>
            )}
            {/* Carousel arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={carouselPrev}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={carouselNext}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
                {/* Dot counter */}
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">
                  {carouselIndex + 1} / {photos.length}
                </p>
              </>
            )}
          </>
        )}

        {/* Mobile overlay buttons */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button
            onClick={handleFavToggle}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={fav}
            className={cn(
              'w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              fav ? 'text-red-500' : 'text-gray-700',
            )}
          >
            {favLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Heart
                className="w-4 h-4"
                aria-hidden="true"
                fill={fav ? 'currentColor' : 'none'}
              />
            )}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share property"
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Report this listing"
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Flag className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Media tabs ── */}
      <div
        className="flex gap-1 mt-3 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Media types"
      >
        {TABS.map(({ key, label, Icon }) => {
          const isDisabled =
            (key === 'video' && !hasVideo) ||
            (key === 'tour360' && !hasTour360) ||
            (key === 'floorplan' && !hasFloorplan)

          return (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDisabled
                  ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                  : activeTab === key
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
              {key === 'photo' && photos.length > 0 && (
                <span className="text-xs text-gray-400 ml-0.5">({photos.length})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Favorite toast ── */}
      {favToast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
          {favToast === 'added' ? 'Added to favorites' : 'Removed from favorites'}
        </div>
      )}

      {/* ── Share modal ── */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Share property"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Share</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close share dialog"
                className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                ) : (
                  <Share2 className="w-4 h-4 text-gray-500" aria-hidden="true" />
                )}
                {copied ? 'Link copied!' : 'Copy link'}
              </button>
              <button
                onClick={() => handleShare('telegram')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-4 h-4 text-blue-500 font-bold text-xs flex items-center justify-center">T</span>
                Telegram
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-4 h-4 text-green-500 font-bold text-xs flex items-center justify-center">W</span>
                WhatsApp
              </button>
              <button
                onClick={() => handleShare('email')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-4 h-4 text-gray-500 text-xs flex items-center justify-center">@</span>
                Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report modal ── */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Report listing"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Report listing</h3>
              <button
                onClick={() => setReportOpen(false)}
                aria-label="Close report dialog"
                className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {reportDone ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Check className="w-8 h-8 text-green-500" aria-hidden="true" />
                <p className="text-sm text-gray-700 text-center">
                  Thank you. Your report has been submitted.
                </p>
              </div>
            ) : (
              <>
                <fieldset className="space-y-2 mb-4">
                  <legend className="text-sm text-gray-600 mb-2">Reason</legend>
                  {REPORT_REASONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={value}
                        checked={reportReason === value}
                        onChange={() => setReportReason(value)}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Additional note (optional)"
                  maxLength={500}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                />
                <button
                  onClick={handleReportSubmit}
                  disabled={!reportReason || reportSubmitting}
                  className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {reportSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" />
                  ) : (
                    'Submit report'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          title={title}
        />
      )}
    </div>
  )
}
