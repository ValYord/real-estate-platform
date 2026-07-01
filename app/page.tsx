import { redirect } from 'next/navigation'

// The middleware (middleware.ts) intercepts "/" and redirects to the default locale.
// This server-side redirect is a fallback for environments where middleware may not run
// (e.g. static export). In normal operation this page is never rendered.
export default function RootPage() {
  redirect('/hy')
}
