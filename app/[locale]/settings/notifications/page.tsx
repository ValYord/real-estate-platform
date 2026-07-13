import type { Metadata } from 'next'
import NotificationPrefsForm from '@/components/settings/NotificationPrefsForm'

export const metadata: Metadata = {
  title: 'Notifications · Settings — RE Platform',
  robots: { index: false, follow: false },
}

export default function SettingsNotificationsPage() {
  return <NotificationPrefsForm />
}
