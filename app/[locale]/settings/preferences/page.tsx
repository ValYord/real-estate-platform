import type { Metadata } from 'next'
import PreferencesForm from '@/components/settings/PreferencesForm'

export const metadata: Metadata = {
  title: 'Preferences · Settings — RE Platform',
  robots: { index: false, follow: false },
}

export default function SettingsPreferencesPage() {
  return <PreferencesForm />
}
