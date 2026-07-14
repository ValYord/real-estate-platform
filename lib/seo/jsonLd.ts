import type { Locale } from '@/lib/locale'
import { SITE_URL } from '@/lib/seo/constants'
import { OFFICE_LOCATION, OFFICE_PHONE_E164, OFFICE_EMAIL, OFFICE_SOCIAL_LINKS } from '@/lib/contact/office'

export interface BreadcrumbEntry {
  label: string
  href?: string
}

/**
 * `BreadcrumbList` JSON-LD, present on every Page 23 route
 * (docs/en/pages/23-static.md §8). Mirrors the `@type: 'BreadcrumbList'`
 * block already emitted by the property detail page's JSON-LD, factored out
 * here so all seven static pages share one implementation.
 */
export function breadcrumbListJsonLd(items: readonly BreadcrumbEntry[], locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}/${locale}${item.href}` } : {}),
    })),
  }
}

/**
 * `Organization` + `LocalBusiness` JSON-LD for `/about` and `/contact`
 * (docs/en/pages/23-static.md §8: "logo, contactPoint, sameAs social
 * networks" + "address, geo").
 */
export function organizationJsonLd(locale: Locale) {
  // Typed as a plain record array (rather than left as an inferred literal
  // union) because Organization and LocalBusiness have different shapes —
  // callers (and tests) commonly do `graph.find(...).someField`, which would
  // otherwise fail to compile against a `TypeA | TypeB` union unless the
  // field exists on both branches.
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'RE Platform',
      url: `${SITE_URL}/${locale}`,
      logo: `${SITE_URL}/logo.png`,
      sameAs: OFFICE_SOCIAL_LINKS.map((link) => link.href),
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: OFFICE_PHONE_E164,
        email: OFFICE_EMAIL,
        contactType: 'customer support',
        areaServed: 'AM',
        availableLanguage: ['hy', 'ru', 'en'],
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#localbusiness`,
      name: 'RE Platform',
      image: `${SITE_URL}/logo.png`,
      telephone: OFFICE_PHONE_E164,
      email: OFFICE_EMAIL,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '1 Northern Ave',
        addressLocality: 'Yerevan',
        postalCode: '0001',
        addressCountry: 'AM',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: OFFICE_LOCATION.lat,
        longitude: OFFICE_LOCATION.lng,
      },
    },
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export interface FaqJsonLdItem {
  question: string
  answer: string
}

/** `FAQPage` JSON-LD for `/faq` (docs/en/pages/23-static.md §8). */
export function faqPageJsonLd(items: readonly FaqJsonLdItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
