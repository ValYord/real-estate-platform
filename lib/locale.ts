/** Supported locale codes. Order matters: first is the default. */
export const LOCALES = ['hy', 'ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** Locale returned when no valid locale can be determined. */
export const DEFAULT_LOCALE: Locale = 'hy'

/**
 * Maps an arbitrary string (or nullish) to a valid Locale.
 * Returns DEFAULT_LOCALE when the input is absent or not in LOCALES.
 *
 * @example
 * safeLocale('ru')   // → 'ru'
 * safeLocale('fr')   // → 'hy'
 * safeLocale(null)   // → 'hy'
 */
export function safeLocale(locale: string | null | undefined): Locale {
  if (locale != null && LOCALES.includes(locale as Locale)) {
    return locale as Locale
  }
  return DEFAULT_LOCALE
}
