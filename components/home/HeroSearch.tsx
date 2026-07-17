'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'
import { cn } from '@/lib/utils'

type TabId = 'buy' | 'rent' | 'sell' | 'estimate'

type TabConfig = {
  id: TabId
  label: string
  placeholder: string
  buildUrl: (q: string) => string
}

const TABS: TabConfig[] = [
  {
    id: 'buy',
    label: 'Buy',
    placeholder: 'City, district, address…',
    buildUrl: (q) =>
      q ? `/search?deal=sale&q=${encodeURIComponent(q)}` : '/search?deal=sale',
  },
  {
    id: 'rent',
    label: 'Rent',
    placeholder: 'City, district, address…',
    buildUrl: (q) =>
      q ? `/search?deal=rent&q=${encodeURIComponent(q)}` : '/search?deal=rent',
  },
  {
    id: 'sell',
    label: 'Sell',
    placeholder: '',
    buildUrl: () => '/sell/new',
  },
  {
    id: 'estimate',
    label: 'Estimate',
    placeholder: 'Enter address for an estimate',
    buildUrl: (q) =>
      q ? `/home-value?address=${encodeURIComponent(q)}` : '/home-value',
  },
]

export default function HeroSearch() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('buy')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0]
  const isSell = activeTab === 'sell'

  const handleSearch = () => {
    router.push(currentTab.buildUrl(query.trim()))
  }

  const handleTabChange = (id: TabId) => {
    setActiveTab(id)
    setQuery('')
    if (id !== 'sell') {
      // Defer focus until the input is visible
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <section
      aria-label="Property search"
      /* Pull up behind the sticky header so the dark hero image shows through
         the transparent header at scroll=0. Content inside has pt-16 to compensate. */
      className="relative h-[440px] md:h-[520px] -mt-16 bg-primary"
    >
      {/* Background image — decorative, alt="" */}
      <Image
        src="/hero.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Dark overlay for WCAG contrast on the white text — a subtle
          top-to-bottom gradient (vs. a flat tint) reads as more premium and
          keeps the hero from looking like an empty solid-color block if the
          background photo is ever a flat/placeholder image. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-neutral-950/40 to-neutral-950/60"
      />

      {/* Hero content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pt-16">
        <FadeIn>
          {/* One and only H1 on the page */}
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight text-center max-w-2xl">
            Find your home in Armenia
          </h1>
        </FadeIn>

        <FadeIn delay={0.08}>
          <p className="text-base md:text-lg text-white/80 mt-3 text-center">
            10,000+ verified listings in one place
          </p>
        </FadeIn>

        {/* Search card */}
        <SlideIn direction="up" delay={0.12}>
          <div className="bg-surface rounded-xl shadow-lg p-2 max-w-2xl w-full mx-auto mt-8">

            {/* Tab strip */}
            <div
              role="tablist"
              aria-label="Search type"
              className="flex gap-1 mb-2"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`hero-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls="hero-panel"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex-1 rounded-md px-4 h-10 text-sm font-medium transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-fg'
                      : 'text-muted hover:bg-neutral-100',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Single panel — content swaps based on active tab */}
            <div
              id="hero-panel"
              role="tabpanel"
              aria-labelledby={`hero-tab-${activeTab}`}
            >
              {isSell ? (
                /* Sell tab: full-width CTA */
                <div className="px-1 pb-1">
                  <Button onClick={handleSearch} size="lg" className="w-full">
                    Post a property &rarr;
                  </Button>
                </div>
              ) : (
                /* Buy / Rent / Estimate: text input + search button */
                <div className="flex flex-col md:flex-row gap-2 px-1 pb-1">
                  {/* Visible label provided via aria-label; sr-only label as backup */}
                  <label htmlFor="hero-search-input" className="sr-only">
                    {currentTab.placeholder}
                  </label>
                  <Input
                    ref={inputRef}
                    id="hero-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentTab.placeholder}
                    aria-label={currentTab.placeholder}
                    autoComplete="off"
                    className="h-12 flex-1 rounded-lg text-base"
                  />
                  <Button
                    onClick={handleSearch}
                    aria-label="Search properties"
                    size="lg"
                    className="rounded-lg flex-shrink-0"
                  >
                    <Search className="w-4 h-4" aria-hidden="true" />
                    Search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SlideIn>
      </div>
    </section>
  )
}
