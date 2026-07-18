import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { BookOpen, ShieldCheck, FilePlus2, Search as SearchIcon, MessageCircle, CreditCard } from 'lucide-react'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd } from '@/lib/seo/jsonLd'
import HelpPageClient from '@/components/help/HelpPageClient'
import type { SearchableArticle } from '@/lib/faq/filter'
import Card from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'

type PageParams = { locale: string }

interface HelpCategory {
  id: string
  title: string
  description: string
  href: string
}

const CATEGORY_ICONS = [BookOpen, ShieldCheck, FilePlus2, SearchIcon, MessageCircle, CreditCard]

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.help' })
  return buildStaticMetadata({
    locale,
    pathname: '/help',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function HelpPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'static.help' })
  const tCommon = await getTranslations({ locale, namespace: 'static.common' })

  const categories = t.raw('categories') as HelpCategory[]
  const popularArticles = t.raw('popularArticles') as SearchableArticle[]

  const breadcrumbItems = [{ label: tCommon('home'), href: '/' }, { label: t('breadcrumb') }]

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      <FadeIn>
        <header className="mt-4">
          <h1 className="text-2xl lg:text-3xl font-semibold text-text">{t('title')}</h1>
          <p className="mt-2 text-muted">{t('subtitle')}</p>
        </header>
      </FadeIn>

      <HelpPageClient popularArticles={popularArticles} />

      {/* Categories */}
      <section className="mt-10 border-t border-border pt-6">
        <FadeIn>
          <h2 className="text-xl font-semibold text-text">{t('categoriesHeading')}</h2>
        </FadeIn>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, index) => {
            const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]
            return (
              <SlideIn key={category.id} direction="up" delay={index * 0.05}>
                <Link
                  href={category.href}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Card variant="interactive" className="h-full p-5">
                    <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
                    <h3 className="mt-3 font-semibold text-text">{category.title}</h3>
                    <p className="text-sm text-muted mt-1">{category.description}</p>
                  </Card>
                </Link>
              </SlideIn>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <FadeIn>
        <section className="mt-10 border-t border-border pt-6 pb-4 text-center">
          <p className="font-medium text-text">{t('stillNeedHelp')}</p>
          <div className="mt-3 flex justify-center gap-3">
            <Link href="/contact" className={buttonVariants({ size: 'md' })}>
              {t('ctaContact')}
            </Link>
            <Link href="/faq" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
              {t('ctaFaq')}
            </Link>
          </div>
        </section>
      </FadeIn>
    </main>
  )
}
