import { describe, it, expect } from 'vitest'
import { safeLocale, LOCALES, DEFAULT_LOCALE } from '../lib/locale'

describe('safeLocale()', () => {
  it('returns a supported locale unchanged', () => {
    for (const loc of LOCALES) {
      expect(safeLocale(loc)).toBe(loc)
    }
  })

  it('returns DEFAULT_LOCALE for an unknown locale string', () => {
    expect(safeLocale('fr')).toBe(DEFAULT_LOCALE)
    expect(safeLocale('de')).toBe(DEFAULT_LOCALE)
    expect(safeLocale('zh')).toBe(DEFAULT_LOCALE)
    expect(safeLocale('')).toBe(DEFAULT_LOCALE)
  })

  it('returns DEFAULT_LOCALE for null', () => {
    expect(safeLocale(null)).toBe(DEFAULT_LOCALE)
  })

  it('returns DEFAULT_LOCALE for undefined', () => {
    expect(safeLocale(undefined)).toBe(DEFAULT_LOCALE)
  })

  it('is case-sensitive (uppercase locale codes are not valid)', () => {
    expect(safeLocale('HY')).toBe(DEFAULT_LOCALE)
    expect(safeLocale('RU')).toBe(DEFAULT_LOCALE)
    expect(safeLocale('EN')).toBe(DEFAULT_LOCALE)
  })

  it('DEFAULT_LOCALE is the first entry in LOCALES', () => {
    expect(DEFAULT_LOCALE).toBe(LOCALES[0])
  })
})
