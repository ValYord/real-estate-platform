import type { Metadata } from 'next'
import PrivacyForm from '@/components/settings/PrivacyForm'

export const metadata: Metadata = {
  title: 'Privacy · Settings — RE Platform',
  robots: { index: false, follow: false },
}

export default function SettingsPrivacyPage() {
  return <PrivacyForm />
}
