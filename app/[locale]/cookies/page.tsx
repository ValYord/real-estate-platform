import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeLocale } from '@/lib/locale'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import LegalPage, { type LegalSection } from '@/components/static/LegalPage'
import ManagePreferencesButton from '@/components/cookies/ManagePreferencesButton'

type PageParams = { locale: string }

interface CookieTableRow {
  category: string
  purpose: string
  duration: string
}

interface CookieTable {
  categoryLabel: string
  purposeLabel: string
  durationLabel: string
  rows: CookieTableRow[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.cookies' })
  return buildStaticMetadata({
    locale,
    pathname: '/cookies',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function CookiesPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.cookies' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })

  const sections = t.raw('sections') as LegalSection[]
  const table = t.raw('table') as CookieTable

  return (
    <LegalPage
      locale={locale}
      homeLabel={tCommon('home')}
      breadcrumbLabel={t('breadcrumb')}
      pathname="/cookies"
      title={t('title')}
      updatedLabel={tCommon('updated')}
      updatedAt={t('updatedAt')}
      intro={t('intro')}
      sections={sections}
    >
      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('tableHeading')}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="py-2 pr-4 font-medium text-gray-700">
                  {table.categoryLabel}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium text-gray-700">
                  {table.purposeLabel}
                </th>
                <th scope="col" className="py-2 font-medium text-gray-700">
                  {table.durationLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.category} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900 font-medium">{row.category}</td>
                  <td className="py-2 pr-4 text-gray-600">{row.purpose}</td>
                  <td className="py-2 text-gray-600">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ManagePreferencesButton label={t('managePreferences')} />
      </section>
    </LegalPage>
  )
}
