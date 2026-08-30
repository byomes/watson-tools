import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import DuplicateReviewBoard from './DuplicateReviewBoard'

export const metadata: Metadata = {
  title: 'Duplicate Members',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why.
export const dynamic = 'force-dynamic'

export default async function DuplicatesPage() {
  await requireLiveTool('cat', 'duplicates')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Possible Duplicate Members</h1>
        <p className="text-sm text-gray-500 mb-6">
          Two people sharing an email or phone are often a couple, not a duplicate — check
          before merging. Merging is permanent: it moves all history onto the record you keep
          and deletes the other.
        </p>
        <DuplicateReviewBoard />
      </div>
    </div>
  )
}
