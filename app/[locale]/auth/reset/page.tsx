import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetForm from '@/components/auth/ResetForm'

export const metadata: Metadata = {
  title: 'Set new password — RE Platform',
  robots: { index: false, follow: false },
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
