'use client'

import './globals.css'

/**
 * Root-level error boundary (Next.js App Router convention).
 *
 * Catches exceptions thrown by `app/[locale]/layout.tsx` itself (e.g. a
 * crash in a globally-mounted client component like the header or cookie
 * banner) — a tier above `app/[locale]/error.tsx`, which only covers errors
 * inside the locale segment's children. Because this replaces the entire
 * root layout, it must render its own `<html>`/`<body>` and can't assume
 * any provider (i18n, query client, …) is still mounted — kept intentionally
 * minimal, styled with the same design tokens via a direct `globals.css`
 * import so it never falls back to Next's raw, unstyled default error page.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
        <div className="max-w-md w-full rounded-lg border border-border bg-surface shadow-sm text-center p-6">
          <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-md font-medium h-11 px-4 text-sm bg-primary text-primary-fg hover:bg-primary/90 shadow-sm transition-colors"
            >
              Try again
            </button>
            {/* global-error replaces the entire root layout (including the
                App Router context a `next/link` needs), so per Next.js's own
                docs this must be a plain full-navigation `<a>`. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md font-medium h-11 px-4 text-sm bg-surface text-text border border-border hover:bg-neutral-100 transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
