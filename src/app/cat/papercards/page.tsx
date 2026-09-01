import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import PaperCardForm from './PaperCardForm'

export const metadata: Metadata = {
  title: 'Paper Connect Cards',
  robots: { index: false, follow: false },
}

// Never statically prerendered -- see cat/attendance/page.tsx for why.
export const dynamic = 'force-dynamic'

export default async function PaperCardsPage() {
  await requireLiveTool('cat', 'papercards')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Paper Connect Cards</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter the details from a paper connect card turned in at church. Each submission is
          logged as attended the most recent Sunday.
        </p>
        <PaperCardForm />
      </div>
    </div>
  )
}
