import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
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
  // The middleware should prevent this from happening, but guard defensively.
  if (!LOCALES.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Header />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
