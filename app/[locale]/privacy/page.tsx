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
  const t = await getTranslations({ locale, namespace: 'static.privacy' })
  return buildStaticMetadata({
    locale,
    pathname: '/privacy',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function PrivacyPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.privacy' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })

  const sections = t.raw('sections') as LegalSection[]

  return (
    <LegalPage
      locale={locale}
      homeLabel={tCommon('home')}
      breadcrumbLabel={t('breadcrumb')}
      pathname="/privacy"
      title={t('title')}
      updatedLabel={tCommon('updated')}
      updatedAt={t('updatedAt')}
      intro={t('intro')}
      sections={sections}
    >
      <div className="mt-8">
        <Link
          href="/settings"
          className="inline-flex h-11 px-4 items-center rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('ctaManageData')}
        </Link>
      </div>
    </LegalPage>
  )
}
