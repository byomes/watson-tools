import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import DeaconBoard from './DeaconBoard'

export const metadata: Metadata = {
  title: 'Deacons',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why.
export const dynamic = 'force-dynamic'

export default async function DeaconsPage() {
  await requireLiveTool('cat', 'deacons')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Catalyst Deacons</h1>
        <p className="text-sm text-gray-500 mb-6">
          Shepherding tool for the deacons of Catalyst Community Church. Tap &quot;Open&quot; to
          view or edit an individual profile.
        </p>
        <DeaconBoard />
      </div>
    </div>
  )
}
