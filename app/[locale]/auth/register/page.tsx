import type { Metadata } from 'next'
import { Suspense } from 'react'
import RegisterForm from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Register — RE Platform',
  robots: { index: false, follow: false },
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
