import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Real Estate Platform — Buy, Sell & Rent in Armenia',
  description:
    'Find 10,000+ verified property listings in Armenia. Buy, sell or rent apartments, houses and land.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* lang="hy" — Armenian default; will become dynamic when next-intl locale routing is wired up */
    <html lang="hy">
      <body className="flex flex-col min-h-screen">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
