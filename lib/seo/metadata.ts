import type { Metadata } from 'next'
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locale'

export interface StaticPageSeoInput {
  locale: Locale
  /** Path without locale prefix, e.g. "/about". */
  pathname: string
  title: string
  description: string
}

/**
 * Builds the `<title>` / meta description / canonical / hreflang metadata
 * shared by every Page 23 static route (docs/en/pages/23-static.md §8).
 *
 * `alternates.languages` lists every supported locale plus `x-default`
 * (pointing at the default-locale URL), and Next.js renders each entry as an
 * `<link rel="alternate" hreflang="…">` tag. `alternates.canonical` renders
 * the `<link rel="canonical">` tag for the currently-requested locale.
 */
export function buildStaticMetadata({
  locale,
  pathname,
  title,
  description,
}: StaticPageSeoInput): Metadata {
  const canonical = `/${locale}${pathname}`

  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    languages[l] = `/${l}${pathname}`
  }
  languages['x-default'] = `/${DEFAULT_LOCALE}${pathname}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}
