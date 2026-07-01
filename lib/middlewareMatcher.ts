/**
 * Returns true when the middleware should apply locale routing to the given
 * pathname.  Pass-through paths are: API routes, Next.js internals (_next /
 * _vercel), and static-asset paths (anything whose last segment has a dot).
 */
export function isLocaleHandledPath(pathname: string): boolean {
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/')
  ) {
    return false
  }

  // Static files: last segment contains a dot (e.g. /hero.jpg, /favicon.ico)
  const lastSegment = pathname.split('/').at(-1) ?? ''
  if (lastSegment.length > 0 && lastSegment.includes('.')) {
    return false
  }

  return true
}
