import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import EventDuplicateReviewBoard from './EventDuplicateReviewBoard'

export const metadata: Metadata = {
  title: 'Duplicate Event Registrations',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why.
export const dynamic = 'force-dynamic'

export default async function EventDuplicatesPage() {
  await requireLiveTool('cat', 'event-duplicates')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Possible Duplicate Registrations</h1>
        <p className="text-sm text-gray-500 mb-6">
          Two registrations sharing an email, phone, or name on the same event — often the same
          person signing up twice (a CSV import plus an email confirmation, a resubmitted form).
          Merging is permanent: it fills in any blank details from the one you drop, lets you set
          the real ticket count, and deletes the other row.
        </p>
        <EventDuplicateReviewBoard />
      </div>
    </div>
  )
}
