/**
 * Absolute site origin used to build fully-qualified URLs inside JSON-LD
 * structured data (search engines require absolute URLs there, unlike
 * `<link rel="canonical">` / `alternates.languages`, which Next.js resolves
 * against `metadataBase` automatically).
 *
 * Falls back to the same placeholder already used by the property detail
 * page's JSON-LD (`app/[locale]/property/[id]/[slug]/page.tsx`) so the two
 * stay consistent until a real production domain is configured.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'
