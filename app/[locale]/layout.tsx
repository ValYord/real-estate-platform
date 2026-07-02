import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ConditionalChrome from '@/components/layout/ConditionalChrome'
import { LOCALES, type Locale } from '@/lib/locale'

export const metadata: Metadata = {
  title: 'Real Estate Platform — Buy, Sell & Rent in Armenia',
  description:
    'Find 10,000+ verified property listings in Armenia. Buy, sell or rent apartments, houses and land.',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Reject any locale segment that is not in our supported list.
  if (!LOCALES.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          {/*
            ConditionalChrome is a Client Component that uses usePathname to
            decide whether to render the mega-menu Header + Footer.
            Auth pages (/auth/*) skip the header/footer and render their own
            minimal chrome inside the auth layout.
          */}
          <ConditionalChrome>{children}</ConditionalChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
