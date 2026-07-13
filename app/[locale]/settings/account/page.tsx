import type { Metadata } from 'next'
import AccountSettings from '@/components/settings/AccountSettings'

export const metadata: Metadata = {
  title: 'Account · Settings — RE Platform',
  robots: { index: false, follow: false },
}

export default function SettingsAccountPage() {
  return <AccountSettings />
}
