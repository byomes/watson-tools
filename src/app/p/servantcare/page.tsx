import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import ServantCareSearch from './ServantCareSearch'

export const metadata: Metadata = {
  title: 'ServantCare Search',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram, same reasoning as cat/connect/page.tsx.
export const dynamic = 'force-dynamic'

export default async function ServantCarePage() {
  await requireLiveTool('p', 'servantcare')

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">ServantCare Search</h1>
        <p className="text-gray-500 mb-8">
          Search the Yomes family&apos;s local copy of ServantCARE&apos;s Hospitality Homes
          directory (Eastern US only).
        </p>
        <ServantCareSearch />
      </div>
    </div>
  )
}
