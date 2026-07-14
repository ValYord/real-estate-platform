import type { ReactNode } from 'react'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import LegalToc from '@/components/static/LegalToc'
import { breadcrumbListJsonLd } from '@/lib/seo/jsonLd'
import type { Locale } from '@/lib/locale'

export interface LegalSection {
  id: string
  heading: string
  body: readonly string[]
}

interface LegalPageProps {
  locale: Locale
  homeLabel: string
  breadcrumbLabel: string
  /** Path without locale prefix, e.g. "/terms" — used for the JSON-LD breadcrumb URL. */
  pathname: string
  title: string
  updatedLabel: string
  updatedAt: string
  intro?: string
  sections: readonly LegalSection[]
  /** Extra content rendered after the mapped sections (e.g. cookie table, CTA link). */
  children?: ReactNode
}

/**
 * Shared layout for the three legal content pages (`/terms`, `/privacy`,
 * `/cookies`) — sticky/collapsible scroll-spy TOC + prose sections + update
 * date (docs/en/pages/23-static.md §2 "Content page (About / Legal)" +
 * §3.4-3.6).
 */
export default function LegalPage({
  locale,
  homeLabel,
  breadcrumbLabel,
  pathname,
  title,
  updatedLabel,
  updatedAt,
  intro,
  sections,
  children,
}: LegalPageProps) {
  const breadcrumbItems = [
    { label: homeLabel, href: '/' },
    { label: breadcrumbLabel, href: pathname },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 lg:grid lg:grid-cols-[220px_minmax(0,760px)] lg:gap-10">
        <LegalToc headings={sections.map((s) => ({ id: s.id, label: s.heading }))} />

        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-400 mt-2">
            {updatedLabel}: {updatedAt}
          </p>
          {intro && <p className="mt-4 text-gray-700 leading-relaxed">{intro}</p>}

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-t border-gray-200 pt-6 mt-8"
            >
              <h2 className="text-xl font-semibold text-gray-900">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-gray-700 leading-relaxed">
                {section.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          {children}
        </div>
      </div>
    </main>
  )
}
