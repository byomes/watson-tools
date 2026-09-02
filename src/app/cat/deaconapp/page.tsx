import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getSession } from '@/lib/deaconAuth'

export const metadata: Metadata = {
  title: 'Deacon App',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and the session cookie makes this
// request-specific anyway).
export const dynamic = 'force-dynamic'

const TILES = [
  {
    href: '/cat/deacons',
    title: 'Deacons',
    description: 'View or edit an individual profile.',
  },
  {
    href: '/cat/shepherdingreport',
    title: 'Shepherding Report',
    description: 'Members grouped by deacon, most at-risk first.',
  },
  {
    href: '/cat/attendance',
    title: 'Sunday Attendance',
    description: 'Mark who was present or absent.',
  },
]

export default async function DeaconAppPage() {
  await requireLiveTool('cat', 'deaconapp')
  if (!(await getSession())) redirect('/cat/deaconapp/login')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Deacon App</h1>
        <p className="text-sm text-gray-500 mb-6">Catalyst Community Church</p>

        <div className="flex flex-col gap-3">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="block rounded-xl border border-gray-200 px-4 py-4 hover:border-gray-400 transition"
            >
              <div className="text-lg font-semibold text-black">{tile.title}</div>
              <div className="text-sm text-gray-500">{tile.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
