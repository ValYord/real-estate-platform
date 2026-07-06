import type { Metadata } from 'next'
import { Suspense } from 'react'
import MyListings from '@/components/dashboard/MyListings'

export const metadata: Metadata = {
  title: 'My listings — Personal panel — RE Platform',
  robots: { index: false, follow: false },
}

export default function DashboardListingsPage() {
  return (
    <div className="pt-8 lg:pt-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My listings</h1>
      <Suspense fallback={
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      }>
        <MyListings />
      </Suspense>
    </div>
  )
}
