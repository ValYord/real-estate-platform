'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

const FAQ_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const

/**
 * FAQ accordion — static translated content (docs/en/pages/17-pricing.md §3.6).
 * Multi-open: each item toggles independently. Hand-rolled (no external
 * dependency), same accessible-disclosure pattern as the rest of this repo
 * (aria-expanded / aria-controls, native <button> gives Enter/Space for free).
 */
export default function PricingFaq() {
  const t = useTranslations('pro')
  const [openIds, setOpenIds] = useState<string[]>([])

  const toggle = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <section className="mt-16 max-w-3xl mx-auto" aria-labelledby="pro-faq-heading">
      <h2 id="pro-faq-heading" className="text-2xl font-bold text-gray-900 text-center mb-6">
        {t('faq.title')}
      </h2>

      <div className="divide-y divide-gray-200">
        {FAQ_IDS.map((id) => {
          const isOpen = openIds.includes(id)
          const triggerId = `pro-faq-trigger-${id}`
          const panelId = `pro-faq-panel-${id}`

          return (
            <div key={id} className="border-b border-gray-200 py-4">
              <h3 className="m-0">
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(id)}
                  className="w-full flex items-center justify-between gap-4 text-left text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <span>{t(`faq.${id}`)}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                className="text-sm text-gray-600 mt-2"
              >
                {t(`faq.a${id.slice(1)}`)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
