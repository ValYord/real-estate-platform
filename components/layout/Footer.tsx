import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

type FooterLink = { label: string; href: string }
type FooterColumn = { heading: string; links: FooterLink[] }

const COLUMNS: FooterColumn[] = [
  {
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
    heading: 'Buyer / Seller',
    links: [
      { label: 'Buy', href: '/search?deal=sale' },
      { label: 'Sell', href: '/home-value' },
      { label: 'Rent', href: '/search?deal=rent' },
      { label: 'Mortgage', href: '/mortgage-calculators' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Guides', href: '/guides' },
      { label: 'Blog', href: '/news' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Help center', href: '/help' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookie policy', href: '/cookies' },
    ],
  },
  {
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
    'text-sm text-gray-400 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:text-white'
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
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* ── Desktop: 5-column grid (≥768 px) ── */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
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

        {/* ── Mobile: <details>/<summary> accordion (<768 px) ── */}
        <div className="md:hidden divide-y divide-gray-700">
          {COLUMNS.map((col) => (
            <details key={col.heading} className="group">
              <summary
                /* `list-none` hides the default disclosure triangle in WebKit */
                className="flex items-center justify-between py-4 cursor-pointer list-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {/* Column title — <summary> is itself a semantic landmark,
                    so using a <span> here is correct and avoids invalid HTML
                    (h2 is flow content, not allowed inside summary phrasing model). */}
                <span className="text-sm font-semibold text-white uppercase tracking-wider">
                  {col.heading}
                </span>
                {/* Chevron icon — rotates when <details> is open. Uses the
                    shared lucide-react icon (like the rest of the header/nav)
                    rather than a hand-rolled <svg> so it always ships with an
                    explicit intrinsic width/height and can't blow up to its
                    unconstrained default size if the Tailwind size utility
                    fails to apply for any reason. */}
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <ul className="pb-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; 2026 Real Estate Platform. All rights reserved.
          </p>
          <nav aria-label="Footer legal links" className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:text-gray-300"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:text-gray-300"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:text-gray-300"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
