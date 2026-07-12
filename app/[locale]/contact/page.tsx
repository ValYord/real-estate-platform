import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeLocale } from '@/lib/locale'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, organizationJsonLd } from '@/lib/seo/jsonLd'
import ContactForm from '@/components/contact/ContactForm'
import OfficeInfo from '@/components/contact/OfficeInfo'
import PropertyMap from '@/components/property/PropertyMap'
import { OFFICE_LOCATION } from '@/lib/contact/office'

type PageParams = { locale: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.contact' })
  return buildStaticMetadata({
    locale,
    pathname: '/contact',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function ContactPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.contact' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })
  const tMap = await getTranslations({ locale, namespace: 'static.contact.map' })

  const breadcrumbItems = [{ label: tCommon('home'), href: '/' }, { label: t('breadcrumb') }]

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <JsonLd data={organizationJsonLd(locale)} />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      <header className="mt-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('heroTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('heroSubtitle')}</p>
      </header>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Form (~58%) */}
        <div className="lg:col-span-3">
          <ContactForm />
        </div>

        {/* Office info + map (~42%) */}
        <div className="lg:col-span-2 space-y-6">
          <OfficeInfo locale={locale} />

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{tMap('heading')}</h2>
            <PropertyMap
              lat={OFFICE_LOCATION.lat}
              lng={OFFICE_LOCATION.lng}
              title="RE Platform office"
              showHeading={false}
              heightClassName="h-[280px]"
              containerClassName=""
              unavailableLabel={tMap('unavailable')}
              openInGoogleMapsLabel={tMap('openInGoogleMaps')}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
