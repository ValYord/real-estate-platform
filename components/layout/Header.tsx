'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, Heart, ChevronDown } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { LOCALES, type Locale } from '@/lib/locale'
import { buttonVariants } from '@/components/ui/Button'
import CurrencySwitcher from '@/components/layout/CurrencySwitcher'
import NotificationBellDesktop from '@/components/notifications/NotificationBellDesktop'
import NotificationBellMobileLink from '@/components/notifications/NotificationBellMobileLink'
import { useUnreadNotifications } from '@/components/notifications/useUnreadNotifications'
import { cn } from '@/lib/utils'

// ─── Nav data ────────────────────────────────────────────────────────────────

type MegaMenuItem = { label: string; href: string }

/** Keys that exist in the 'nav' translation namespace. */
type NavKey = 'buy' | 'sell' | 'rent' | 'mortgage' | 'findAgent' | 'newsGuides'

type NavItemConfig = {
  /** Translation key inside the 'nav' namespace. */
  key: NavKey
  items: MegaMenuItem[]
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'buy',
    items: [
      { label: 'Properties for sale', href: '/search?deal=sale' },
      { label: 'New construction', href: '/search?type=new_construction' },
      { label: 'Foreclosed', href: '/search?deal=sale&type=foreclosed' },
      { label: 'Open houses', href: '/search?open_house=true' },
      { label: 'Market trends', href: '/neighborhood/yerevan' },
      { label: 'Buyer tips', href: '/guides?category=buyer' },
    ],
  },
  {
    key: 'sell',
    items: [
      { label: "What's my home worth", href: '/home-value' },
      { label: 'Selling tools', href: '/guides?category=seller' },
      { label: 'Selling tips', href: '/guides?category=selling-tips' },
      { label: 'Recently sold', href: '/search?status=sold' },
    ],
  },
  {
    key: 'rent',
    items: [
      { label: 'Apartments for rent', href: '/search?deal=rent' },
      { label: 'Renter tools', href: '/guides?category=renter' },
      { label: 'Landlord tools', href: '/landlord' },
      { label: 'Renting tips', href: '/guides?category=renting-tips' },
    ],
  },
  {
    key: 'mortgage',
    items: [
      { label: 'Calculators', href: '/mortgage-calculators' },
      { label: 'Rates', href: '/mortgage/rates' },
      { label: 'Pre-approval', href: '/mortgage/pre-approval' },
      { label: 'Finance tips', href: '/guides?category=finance' },
    ],
  },
  {
    key: 'findAgent',
    items: [
      { label: 'Find an agent', href: '/agents' },
      { label: 'Compare agents', href: '/agents/compare' },
      { label: 'Teams & companies', href: '/agents/teams' },
      { label: 'Why an agent', href: '/guides/why-an-agent' },
    ],
  },
  {
    key: 'newsGuides',
    items: [
      { label: 'News', href: '/news' },
      { label: 'Insights', href: '/news/insights' },
      { label: 'Guides', href: '/guides' },
      { label: 'Videos', href: '/news/videos' },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Header() {
  const tNav = useTranslations('nav')
  const tHeader = useTranslations('header')

  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Page 22 — Notifications: single subscription/query shared by the
  // desktop dropdown bell and the mobile drawer bell (see the hook's doc
  // comment for why this must be called exactly once).
  const { userId, unreadCount, markAllReadOptimistic, markOneReadOptimistic } = useUnreadNotifications()

  // Track scroll position to switch header background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile drawer on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const openDropdown = (key: string) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
    setOpenMenu(key)
  }

  const closeDropdown = () => {
    menuTimerRef.current = setTimeout(() => setOpenMenu(null), 120)
  }

  const cancelClose = () => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
  }

  /** Switch to a different locale while keeping the current pathname. */
  const handleLocaleSwitch = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <>
      {/* ── Main header bar ── */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full h-16 transition-colors duration-200',
          scrolled ? 'bg-surface shadow-sm' : 'bg-transparent',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">

          {/* Left: Logo */}
          <Link
            href="/"
            className={cn(
              'flex-shrink-0 text-xl font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded',
              scrolled ? 'text-primary' : 'text-white',
            )}
          >
            {tHeader('logo')}
          </Link>

          {/* Center: Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => openDropdown(item.key)}
                onMouseLeave={closeDropdown}
              >
                <button
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    scrolled
                      ? 'text-text hover:text-primary hover:bg-neutral-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10',
                    openMenu === item.key &&
                      (scrolled ? 'text-primary bg-neutral-100' : 'text-white bg-white/10'),
                  )}
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.key}
                  onFocus={() => openDropdown(item.key)}
                  onBlur={closeDropdown}
                >
                  {tNav(item.key)}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-150',
                      openMenu === item.key ? 'rotate-180' : '',
                    )}
                  />
                </button>

                {/* Mega-menu dropdown */}
                {openMenu === item.key && (
                  <div
                    className="absolute top-full left-0 mt-1 w-52 bg-surface rounded-xl shadow-lg border border-border py-2 z-50"
                    role="menu"
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    {item.items.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2.5 text-sm text-text hover:bg-neutral-50 hover:text-primary transition-colors duration-100 focus-visible:outline-none focus-visible:bg-neutral-50 focus-visible:text-primary"
                        role="menuitem"
                        onClick={() => setOpenMenu(null)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right: Desktop utilities */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Favorites */}
            <Link
              href="/favorites"
              aria-label={tHeader('favorites')}
              className={cn(
                'p-2 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                scrolled
                  ? 'text-muted hover:text-primary hover:bg-neutral-100'
                  : 'text-white/80 hover:text-white hover:bg-white/10',
              )}
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
            </Link>

            {/* Notifications — guests don't see the bell (doc "Roles") */}
            {userId && (
              <NotificationBellDesktop
                scrolled={scrolled}
                unreadCount={unreadCount}
                onMarkAllRead={markAllReadOptimistic}
                onItemRead={markOneReadOptimistic}
              />
            )}

            {/* Separator */}
            <div
              aria-hidden="true"
              className={cn('w-px h-5 mx-1', scrolled ? 'bg-neutral-200' : 'bg-white/20')}
            />

            {/* Language switcher */}
            <div
              role="group"
              aria-label={tHeader('language')}
              className={cn(
                'flex items-center rounded-lg overflow-hidden border text-xs font-medium',
                scrolled ? 'border-border' : 'border-white/30',
              )}
            >
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocaleSwitch(loc)}
                  aria-pressed={locale === loc}
                  aria-label={`Switch language to ${loc.toUpperCase()}`}
                  className={cn(
                    'px-2 py-1.5 transition-colors duration-100',
                    'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary',
                    locale === loc
                      ? 'bg-primary text-primary-fg'
                      : scrolled
                        ? 'text-muted hover:bg-neutral-100'
                        : 'text-white/80 hover:bg-white/10',
                  )}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Currency switcher */}
            <CurrencySwitcher variant="header" scrolled={scrolled} />

            {/* Post a property — styled via Button's variant classes (buttonVariants)
                so this primary CTA matches every other primary Button in the app,
                even though it must stay a <Link> for real navigation semantics. */}
            <Link
              href="/sell/new"
              className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'ml-1 rounded-lg')}
            >
              {tHeader('postProperty')}
            </Link>

            {/* Sign in */}
            <Link
              href="/auth/login"
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                scrolled
                  ? 'text-text border-border hover:bg-neutral-50'
                  : 'text-white border-white/40 hover:bg-white/10',
              )}
            >
              {tHeader('signIn')}
            </Link>
          </div>

          {/* Mobile: hamburger */}
          <button
            className={cn(
              'lg:hidden p-2 rounded-lg transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              scrolled
                ? 'text-text hover:bg-neutral-100'
                : 'text-white hover:bg-white/10',
            )}
            onClick={() => setMobileOpen(true)}
            aria-label={tHeader('openMenu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 bg-black/50 z-50 lg:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Mobile drawer panel ── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-surface z-50 lg:hidden shadow-xl transition-transform duration-300 flex flex-col',
          mobileOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-shrink-0">
          <span className="text-lg font-bold text-primary">{tHeader('logo')}</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={tHeader('closeMenu')}
            className="p-2 rounded-lg text-muted hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <nav aria-label="Mobile navigation" className="py-2">
            {NAV_ITEMS.map((item) => (
              <div key={item.key}>
                <p className="px-4 pt-4 pb-1 text-[11px] font-semibold text-muted uppercase tracking-widest">
                  {tNav(item.key)}
                </p>
                {item.items.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-6 py-2.5 text-sm text-text hover:bg-neutral-50 hover:text-primary transition-colors focus-visible:outline-none focus-visible:bg-neutral-50 focus-visible:text-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Utility controls */}
          <div className="border-t border-border p-4 space-y-4">
            {/* Language */}
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">
                {tHeader('language')}
              </p>
              <div className="flex gap-2">
                {LOCALES.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      handleLocaleSwitch(loc)
                      setMobileOpen(false)
                    }}
                    aria-pressed={locale === loc}
                    aria-label={`Switch language to ${loc.toUpperCase()}`}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      locale === loc
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'text-muted border-border hover:bg-neutral-50',
                    )}
                  >
                    {loc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">
                {tHeader('currency')}
              </p>
              <CurrencySwitcher variant="drawer" />
            </div>

            {/* CTA buttons */}
            <div className="space-y-2 pt-1">
              <Link
                href="/sell/new"
                className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-full rounded-lg')}
                onClick={() => setMobileOpen(false)}
              >
                {tHeader('postProperty')}
              </Link>
              <Link
                href="/auth/login"
                className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'w-full rounded-lg')}
                onClick={() => setMobileOpen(false)}
              >
                {tHeader('signIn')}
              </Link>
              <div className="flex justify-center gap-6 pt-2">
                <Link
                  href="/favorites"
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  {tHeader('favorites')}
                </Link>
                {userId && (
                  <NotificationBellMobileLink
                    unreadCount={unreadCount}
                    onNavigate={() => setMobileOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
