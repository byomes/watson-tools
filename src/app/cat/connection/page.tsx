import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getSession } from '@/lib/deaconAuth'
import ConnectionBoard from './ConnectionBoard'

export const metadata: Metadata = {
  title: 'Connection',
  robots: { index: false, follow: false },
}

// Request-specific (session cookie + live go-live gate): never prerendered.
export const dynamic = 'force-dynamic'

export default async function ConnectionPage() {
  await requireLiveTool('cat', 'connection')
  // Same login as the Shepherding App (elders, deacons, staff).
  if (!(await getSession())) redirect('/cat/deaconapp/login')

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Connection</h1>
        <p className="text-sm text-gray-500 mb-5">
          Worship, groups, serving and events for each person. Use this to see who to reach out to and who is thriving.
          Follow-up is shepherd work.
        </p>
        <ConnectionBoard />
      </div>
    </div>
  )
}
