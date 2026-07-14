import { getRequestConfig } from 'next-intl/server'
import type { AbstractIntlMessages } from 'use-intl'
import { safeLocale } from '@/lib/locale'

/** Lazy message loaders — avoids dynamic template-literal imports. */
const messageLoaders = {
  hy: () => import('../messages/hy.json'),
  ru: () => import('../messages/ru.json'),
  en: () => import('../messages/en.json'),
} as const

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = safeLocale(await requestLocale)
  const messages = (await messageLoaders[locale]()).default

  // `AbstractIntlMessages` (use-intl) is typed as a recursive
  // string/object-only tree, but the Page 23 static content legitimately
  // stores arrays (FAQ items, legal sections, paragraph lists) accessed via
  // `t.raw()` — a documented next-intl escape hatch for non-string values.
  // The cast only relaxes the *type*; the JSON shape itself is unchanged.
  return { locale, messages: messages as unknown as AbstractIntlMessages }
})
