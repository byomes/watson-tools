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
          Large group houses found on VRBO and Airbnb along the Atlantic coast from Virginia to
          Florida — for the family reunion week. Set the bedrooms, bathrooms, pool, and beach-access
          criteria you actually want below (7 bd / 3 ba / pool / oceanfront is just a starting
          guess), then save or dismiss what comes back. There&apos;s no live pricing — both sites
          block automated price lookups — so jot down what you find on the real listing in the
          price note field and it&apos;ll stick around for next time.
        </p>
        <BeachHouseSearch />
      </div>
    </div>
  )
}
