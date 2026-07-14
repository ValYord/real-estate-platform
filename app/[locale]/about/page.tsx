import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck, Handshake, MapPinned, Globe2 } from 'lucide-react'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, organizationJsonLd } from '@/lib/seo/jsonLd'

type PageParams = { locale: string }

const VALUE_ICONS = [ShieldCheck, Handshake, MapPinned, Globe2]

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.about' })
  return buildStaticMetadata({
    locale,
    pathname: '/about',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function AboutPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.about' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })

  const storyParagraphs = t.raw('storyParagraphs') as string[]
  const values = t.raw('values') as Array<{ title: string; body: string }>
  const stats = t.raw('stats') as Array<{ value: string; label: string }>

  const breadcrumbItems = [{ label: tCommon('home'), href: '/' }, { label: t('breadcrumb') }]

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <JsonLd data={organizationJsonLd(locale)} />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      {/* Hero */}
      <header className="mt-4 max-w-[760px]">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('heroTitle')}</h1>
        <p className="mt-3 text-lg text-gray-600">{t('heroTagline')}</p>
      </header>

      {/* Our story */}
      <section className="mt-10 max-w-[760px] border-t border-gray-200 pt-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('storyHeading')}</h2>
        {storyParagraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </section>

      {/* Mission & values */}
      <section className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('missionHeading')}</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, index) => {
            const Icon = VALUE_ICONS[index % VALUE_ICONS.length]
            return (
              <div key={value.title} className="flex gap-3 items-start">
                <Icon className="w-10 h-10 text-primary flex-shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-gray-900">{value.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{value.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Statistics */}
      <section className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('statsHeading')}</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 border-t border-gray-200 pt-6 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('ctaHeading')}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/sell/new"
            className="h-12 px-6 rounded-lg bg-primary text-white font-medium flex items-center hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('ctaListLabel')}
          </Link>
          <Link
            href="/search"
            className="h-12 px-6 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('ctaSearchLabel')}
          </Link>
          <Link
            href="/contact"
            className="h-12 px-6 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('ctaContactLabel')}
          </Link>
        </div>
      </section>
    </main>
  )
}
