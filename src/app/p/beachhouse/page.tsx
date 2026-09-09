import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import BeachHouseSearch from './BeachHouseSearch'

export const metadata: Metadata = {
  title: 'Beach House Search',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram, same reasoning as cat/connect/page.tsx.
export const dynamic = 'force-dynamic'

export default async function BeachHousePage() {
  await requireLiveTool('p', 'beachhouse')

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">Beach House Search</h1>
        <p className="text-gray-500 mb-8">
          7+ bedroom, 3+ bathroom houses with a pool and direct beach access, found on VRBO and
          Airbnb across Virginia, North Carolina, and South Carolina — for the family reunion week.
          Save the ones you like, dismiss the rest.
        </p>
        <BeachHouseSearch />
      </div>
    </div>
  )
}
