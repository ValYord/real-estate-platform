import type { Metadata } from 'next'
import { Suspense } from 'react'
import VerifyForm from '@/components/auth/VerifyForm'

export const metadata: Metadata = {
  title: 'Verify account — RE Platform',
  robots: { index: false, follow: false },
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
