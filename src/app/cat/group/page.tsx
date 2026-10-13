import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import GroupsBoard from '../groups/GroupsBoard'

export const metadata: Metadata = {
  title: 'Group Attendance',
  robots: { index: false, follow: false },
}

// Never statically prerendered: the link's validity is live DB state.
export const dynamic = 'force-dynamic'

// One group's attendance page, opened from a link Watson texts to the group's leader
// (jobs/congregation/group_links.py). The token limits everything on this page to that one group.
export default async function GroupLinkPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireLiveTool('cat', 'groups')
  const { t } = await searchParams
  let title: string | null = null
  if (t) {
    const res = await watsonFetch(`/api/cat/groups/link/resolve?token=${encodeURIComponent(t)}`, {
      headers: { 'X-Watson-Key': process.env.GROUPS_API_KEY ?? '' },
    }).catch(() => null)
    if (res?.ok) title = (await res.json()).title ?? null
  }

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        {title && t ? (
          <>
            <h1 className="text-2xl font-bold text-black mb-1">{title}</h1>
            <p className="text-sm text-gray-500 mb-6">
              Turn on everyone who came, and tap + Add a name for anyone new. Changes save immediately.
            </p>
            <GroupsBoard groupToken={t} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-black mb-1">Group Attendance</h1>
            <p className="text-sm text-gray-500">This link has expired or is not valid. Ask for a new one.</p>
          </>
        )}
      </div>
    </div>
  )
}
