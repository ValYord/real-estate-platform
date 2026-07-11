import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage public URLs (message attachments, avatars, listing
    // media) are rendered via next/image across the app, including the
    // Page 09 (Messages) attachment thumbnail/lightbox — without an
    // allowlisted remote pattern, next/image rejects any *.supabase.co src.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
