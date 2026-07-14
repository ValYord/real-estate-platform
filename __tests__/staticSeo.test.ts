/**
 * Tests for lib/seo/metadata.ts#buildStaticMetadata — the shared canonical /
 * hreflang / x-default builder used by all seven Page 23 static routes
 * (docs/en/pages/23-static.md §8).
 */
import { describe, it, expect } from 'vitest'
import { buildStaticMetadata } from '../lib/seo/metadata'
import { breadcrumbListJsonLd, faqPageJsonLd, organizationJsonLd } from '../lib/seo/jsonLd'

describe('buildStaticMetadata', () => {
  it('sets a locale-prefixed canonical URL', () => {
    const metadata = buildStaticMetadata({
      locale: 'en',
      pathname: '/about',
      title: 'About us',
      description: 'desc',
    })
    expect(metadata.alternates?.canonical).toBe('/en/about')
  })

  it('lists hreflang alternates for every supported locale plus x-default', () => {
    const metadata = buildStaticMetadata({
      locale: 'ru',
      pathname: '/faq',
      title: 'FAQ',
      description: 'desc',
    })
    const languages = metadata.alternates?.languages as Record<string, string>
    expect(languages.hy).toBe('/hy/faq')
    expect(languages.ru).toBe('/ru/faq')
    expect(languages.en).toBe('/en/faq')
    // x-default points at the default locale (hy).
    expect(languages['x-default']).toBe('/hy/faq')
  })

  it('sets the title and description verbatim', () => {
    const metadata = buildStaticMetadata({
      locale: 'hy',
      pathname: '/contact',
      title: 'Contact us | RE Platform',
      description: 'Get in touch.',
    })
    expect(metadata.title).toBe('Contact us | RE Platform')
    expect(metadata.description).toBe('Get in touch.')
    expect(metadata.openGraph?.title).toBe('Contact us | RE Platform')
  })
})

describe('breadcrumbListJsonLd', () => {
  it('builds a BreadcrumbList with 1-based positions and absolute URLs', () => {
    const jsonLd = breadcrumbListJsonLd(
      [{ label: 'Home', href: '/' }, { label: 'FAQ' }],
      'en'
    )
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    expect(jsonLd.itemListElement).toHaveLength(2)
    expect(jsonLd.itemListElement[0]).toMatchObject({ position: 1, name: 'Home' })
    expect(jsonLd.itemListElement[0].item).toMatch(/^https?:\/\/.+\/en\/$/)
    // The last crumb (current page) has no href, so no `item` URL.
    expect(jsonLd.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'FAQ' })
  })
})

describe('organizationJsonLd', () => {
  it('includes an Organization with a sameAs list and a LocalBusiness with geo coordinates', () => {
    const jsonLd = organizationJsonLd('en')
    const org = jsonLd['@graph'].find((node) => node['@type'] === 'Organization')
    const business = jsonLd['@graph'].find((node) => node['@type'] === 'LocalBusiness')
    expect(org).toBeDefined()
    expect(Array.isArray(org?.sameAs)).toBe(true)
    expect((org?.sameAs as string[]).length).toBeGreaterThan(0)
    expect(business?.geo).toMatchObject({ '@type': 'GeoCoordinates' })
  })
})

describe('faqPageJsonLd', () => {
  it('maps question/answer pairs to schema.org Question/Answer nodes', () => {
    const jsonLd = faqPageJsonLd([{ question: 'Q1?', answer: 'A1.' }])
    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Q1?',
        acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
      },
    ])
  })
})
