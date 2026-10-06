import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import GroupsBoard from './GroupsBoard'

export const metadata: Metadata = {
  title: 'Group Attendance',
  robots: { index: false, follow: false },
}

// Never statically prerendered: the go-live gate is live DB state.
export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  await requireLiveTool('cat', 'groups')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Group Attendance</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your regulars are listed with toggles. Turn on everyone who came, and tap + Add a name for anyone new. They join your regulars. Changes save immediately.
        </p>
        <GroupsBoard />
      </div>
    </div>
  )
}
