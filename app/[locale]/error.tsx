'use client'

import { useEffect } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

/**
 * Route-segment error boundary (Next.js App Router convention).
 *
 * Without this file, any uncaught client-side exception anywhere below the
 * locale layout (e.g. a component that throws during/after hydration) falls
 * through to Next's built-in fallback: a blank, completely unstyled page
 * with the text "Application error: a client-side exception has occurred" —
 * exactly the critical failure a visual review flagged on `/en/help`. This
 * boundary catches that same class of error and renders an on-brand,
 * themed page instead, with a way to recover (`reset()` re-renders the
 * segment without a full reload).
 *
 * Deliberately minimal: it must not depend on anything that could itself be
 * the source of a crash (data fetching, i18n context that may already be
 * torn down, etc.) — just tokens + primitives.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full text-center">
        <CardBody className="flex flex-col items-center gap-4">
          <span className="flex items-center justify-center size-12 rounded-full bg-danger/10 text-danger">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted">
              An unexpected error occurred while loading this page. You can try again, or head
              back home.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Button onClick={() => reset()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.assign('/')}>
              Go home
            </Button>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
