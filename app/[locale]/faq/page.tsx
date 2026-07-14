import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeLocale } from '@/lib/locale'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/jsonLd'
import FaqPageClient from '@/components/faq/FaqPageClient'
import type { FaqItem } from '@/lib/faq/filter'

type PageParams = { locale: string }

interface RawFaqItem {
  id: string
  category: string
  question: string
  answer: string
  linkHref?: string
  linkLabel?: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.faq' })
  return buildStaticMetadata({
    locale,
    pathname: '/faq',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function FaqPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.faq' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })

  const rawItems = t.raw('items') as RawFaqItem[]
  const items: FaqItem[] = rawItems.map((item) => ({
    id: item.id,
    category: item.category,
    question: item.question,
    answer: item.answer,
    linkHref: item.linkHref,
    linkLabel: item.linkLabel,
  }))
  const categories = t.raw('categories') as Record<string, string>

  const breadcrumbItems = [{ label: tCommon('home'), href: '/' }, { label: t('breadcrumb') }]

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <JsonLd data={faqPageJsonLd(items)} />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      <h1 className="mt-4 text-2xl lg:text-3xl font-bold text-gray-900">{t('title')}</h1>

      <FaqPageClient items={items} categories={categories} />
    </main>
  )
}
