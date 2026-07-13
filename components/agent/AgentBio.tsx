'use client'

import { useState } from 'react'

interface AgentBioProps {
  text: string
  specialties: string[]
  isOwner: boolean
}

const SPECIALTY_LABEL: Record<string, string> = {
  apartments: 'Apartments',
  new_construction: 'New construction',
  commercial: 'Commercial',
  rentals: 'Rentals',
  houses: 'Houses',
  land: 'Land',
}

/**
 * "About" section — bio text (collapsed to ~4 lines with a Read more/Hide
 * toggle) + specialty chips. docs/en/pages/10-agent-profile.md §3.3.
 */
export default function AgentBio({ text, specialties, isOwner }: AgentBioProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text && specialties.length === 0) {
    if (!isOwner) return null
    return (
      <section className="border-t border-gray-200 pt-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
        <button
          type="button"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          + Add your about text
        </button>
      </section>
    )
  }

  return (
    <section className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>

      {text && (
        <>
          <p
            className={`text-gray-700 leading-relaxed whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}
          >
            {text}
          </p>
          {text.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-sm text-primary font-medium mt-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {expanded ? 'Hide ▴' : 'Read more ▾'}
            </button>
          )}
        </>
      )}

      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {specialties.map((s) => (
            <span key={s} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
              {SPECIALTY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
