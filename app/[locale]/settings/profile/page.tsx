import type { Metadata } from 'next'
import ProfileForm from '@/components/settings/ProfileForm'

export const metadata: Metadata = {
  title: 'Profile · Settings — RE Platform',
  robots: { index: false, follow: false },
}

export default function SettingsProfilePage() {
  return <ProfileForm />
}
