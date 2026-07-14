import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import LegalPage, { type LegalSection } from '@/components/static/LegalPage'

type PageParams = { locale: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.terms' })
  return buildStaticMetadata({
    locale,
    pathname: '/terms',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function TermsPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.terms' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })
  const tPrivacy = await getTranslations({ locale, namespace: 'static.privacy' })
  const tCookies = await getTranslations({ locale, namespace: 'static.cookies' })

  const sections = t.raw('sections') as LegalSection[]

  return (
    <LegalPage
      locale={locale}
      homeLabel={tCommon('home')}
      breadcrumbLabel={t('breadcrumb')}
      pathname="/terms"
      title={t('title')}
      updatedLabel={tCommon('updated')}
      updatedAt={t('updatedAt')}
      intro={t('intro')}
      sections={sections}
    >
      <p className="mt-8 text-sm text-gray-500">
        See also:{' '}
        <Link href="/privacy" className="text-primary underline">
          {tPrivacy('breadcrumb')}
        </Link>{' '}
        ·{' '}
        <Link href="/cookies" className="text-primary underline">
          {tCookies('breadcrumb')}
        </Link>
      </p>
    </LegalPage>
  )
}
