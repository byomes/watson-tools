import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import GetawaySearch from './GetawaySearch'

export const metadata: Metadata = {
  title: 'Getaway Search',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram, same reasoning as cat/connect/page.tsx.
export const dynamic = 'force-dynamic'

export default async function GetawayPage() {
  await requireLiveTool('p', 'beachhouse')

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">Getaway Search</h1>
        <p className="text-gray-500 mb-8">
          Candidates found on VRBO and Airbnb, by tab: Beach (VA-FL Atlantic coast, for the family
          reunion week), Mountain, and Romance (both within roughly a 12-hour drive of Wilmington,
          DE). Every filter below — states, bedrooms, bathrooms, amenities — is a starting guess for
          that tab, not a fixed rule; change anything and search again. Save or dismiss what comes
          back. There&apos;s no live pricing — both sites block automated price lookups — so jot down
          what you find on the real listing in the price note field and it&apos;ll stick around for
          next time.
        </p>
        <GetawaySearch />
      </div>
    </div>
  )
}
