import { getRequestConfig } from 'next-intl/server'
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

  return { locale, messages }
})
