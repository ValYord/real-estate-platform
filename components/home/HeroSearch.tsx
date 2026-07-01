'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
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
      className="relative h-[440px] md:h-[520px] -mt-16"
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

      {/* Dark overlay for WCAG contrast on the white text */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      {/* Hero content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pt-16">
        {/* One and only H1 on the page */}
        <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight text-center max-w-2xl">
          Find your home in Armenia
        </h1>

        <p className="text-base md:text-lg text-white/80 mt-3 text-center">
          10,000+ verified listings in one place
        </p>

        {/* Search card */}
        <div className="bg-white rounded-xl shadow-lg p-2 max-w-2xl w-full mx-auto mt-8">

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
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100',
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
                <button
                  onClick={handleSearch}
                  className="w-full h-12 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Post a property &rarr;
                </button>
              </div>
            ) : (
              /* Buy / Rent / Estimate: text input + search button */
              <div className="flex flex-col md:flex-row gap-2 px-1 pb-1">
                {/* Visible label provided via aria-label; sr-only label as backup */}
                <label htmlFor="hero-search-input" className="sr-only">
                  {currentTab.placeholder}
                </label>
                <input
                  ref={inputRef}
                  id="hero-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentTab.placeholder}
                  aria-label={currentTab.placeholder}
                  autoComplete="off"
                  className="h-12 flex-1 px-4 text-base outline-none rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 transition-shadow duration-150"
                />
                <button
                  onClick={handleSearch}
                  aria-label="Search properties"
                  className="h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
