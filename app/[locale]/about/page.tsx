import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck, Handshake, MapPinned, Globe2 } from 'lucide-react'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import JsonLd from '@/components/static/JsonLd'
import { buildStaticMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, organizationJsonLd } from '@/lib/seo/jsonLd'
import Card, { CardBody } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'
import Stagger from '@/components/motion/Stagger'
import Reveal from '@/components/motion/Reveal'

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
    <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <JsonLd data={organizationJsonLd(locale)} />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems, locale)} />
      <Breadcrumbs items={breadcrumbItems} />

      {/* Hero */}
      <FadeIn>
        <header className="mt-6 max-w-[760px]">
          <h1 className="text-2xl lg:text-3xl font-bold text-text">{t('heroTitle')}</h1>
          <p className="mt-3 text-lg text-muted">{t('heroTagline')}</p>
        </header>
      </FadeIn>

      {/* Our story */}
      <SlideIn>
        <section className="mt-12 max-w-[760px] border-t border-border pt-8 space-y-4">
          <h2 className="text-xl font-semibold text-text">{t('storyHeading')}</h2>
          {storyParagraphs.map((paragraph, index) => (
            <p key={index} className="text-text leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      </SlideIn>

      {/* Mission & values */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-text">{t('missionHeading')}</h2>
        <Stagger className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, index) => {
            const Icon = VALUE_ICONS[index % VALUE_ICONS.length]
            return (
              <Card key={value.title}>
                <CardBody className="flex gap-3 items-start">
                  <Icon className="w-10 h-10 text-primary flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-text">{value.title}</h3>
                    <p className="text-sm text-muted mt-1">{value.body}</p>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </Stagger>
      </section>

      {/* Statistics */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-text">{t('statsHeading')}</h2>
        <Stagger className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardBody className="text-center sm:text-left">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted mt-1">{stat.label}</p>
              </CardBody>
            </Card>
          ))}
        </Stagger>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="mt-12 border-t border-border pt-8 pb-4">
          <h2 className="text-xl font-semibold text-text">{t('ctaHeading')}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/sell/new" className={buttonVariants({ size: 'lg' })}>
              {t('ctaListLabel')}
            </Link>
            <Link
              href="/search"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              {t('ctaSearchLabel')}
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              {t('ctaContactLabel')}
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  )
}
