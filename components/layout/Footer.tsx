'use client'

import { useState } from 'react'
import Link from 'next/link'
import Accordion, { type AccordionItemData } from '@/components/ui/Accordion'

type FooterLink = { label: string; href: string }
type FooterColumn = { id: string; heading: string; links: FooterLink[] }

const COLUMNS: FooterColumn[] = [
  {
    id: 'company',
    heading: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Pricing', href: '/pro' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    id: 'buyer-seller',
    heading: 'Buyer / Seller',
    links: [
      { label: 'Buy', href: '/search?deal=sale' },
      { label: 'Sell', href: '/home-value' },
      { label: 'Rent', href: '/search?deal=rent' },
      { label: 'Mortgage', href: '/mortgage-calculators' },
    ],
  },
  {
    id: 'resources',
    heading: 'Resources',
    links: [
      { label: 'Guides', href: '/guides' },
      { label: 'Blog', href: '/news' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Help center', href: '/help' },
    ],
  },
  {
    id: 'legal',
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookie policy', href: '/cookies' },
    ],
  },
  {
    id: 'contact',
    heading: 'Contact',
    links: [
      { label: 'Facebook', href: 'https://facebook.com' },
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'Telegram', href: 'https://t.me' },
      { label: 'YouTube', href: 'https://youtube.com' },
    ],
  },
]

/** Returns true if the href points to an external URL. */
function isExternal(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

/** Renders a footer link — Next.js <Link> for internal, <a> for external. */
function FooterLink({ label, href }: FooterLink) {
  const cls =
    'text-sm text-neutral-400 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:text-white'
  return isExternal(href) ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {label}
    </Link>
  )
}

export default function Footer() {
  // IDs of currently expanded mobile accordion sections (all collapsed by default).
  const [openIds, setOpenIds] = useState<string[]>([])

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]))

  const accordionItems: AccordionItemData[] = COLUMNS.map((col) => ({
    id: col.id,
    trigger: (
      <span className="text-sm font-semibold text-white uppercase tracking-wider">
        {col.heading}
      </span>
    ),
    content: (
      <ul className="space-y-3">
        {col.links.map((link) => (
          <li key={link.href}>
            <FooterLink {...link} />
          </li>
        ))}
      </ul>
    ),
  }))

  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* ── Desktop: 5-column grid (≥768 px) ── */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.id}>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {col.heading}
              </h2>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Mobile: accordion primitive (<768 px) ──
            Composes components/ui/Accordion (dark variant) instead of a
            hand-rolled <details>/<summary> + inline <svg> chevron — the
            lucide-react icons it renders always carry explicit width/height
            SVG attributes, so they can never balloon to an unbounded size
            the way a bare, class-only-sized <svg> can. */}
        <div className="md:hidden">
          <Accordion items={accordionItems} openIds={openIds} onToggle={toggle} variant="dark" />
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            &copy; 2026 Real Estate Platform. All rights reserved.
          </p>
          <nav aria-label="Footer legal links" className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline-none focus-visible:text-neutral-300"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline-none focus-visible:text-neutral-300"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline-none focus-visible:text-neutral-300"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
