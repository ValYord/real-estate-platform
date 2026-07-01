import type { ReactNode } from 'react'
import './globals.css'

// Root layout required by Next.js App Router.
// The <html> and <body> elements — including the dynamic lang= attribute —
// are rendered by app/[locale]/layout.tsx so they reflect the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
