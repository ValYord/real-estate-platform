import { redirect } from '@/i18n/navigation'

/** `/settings` redirects to the default tab, Profile (§2 layout / §5 routes). */
export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/settings/profile', locale })
}
