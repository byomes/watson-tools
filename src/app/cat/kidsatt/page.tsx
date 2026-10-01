import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import KidsAttendanceBoard from './KidsAttendanceBoard'
import BatchImportButton from './BatchImportButton'

export const metadata: Metadata = {
  title: 'Kids Attendance',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram (see src/lib/requireLiveTool.ts).
export const dynamic = 'force-dynamic'

export default async function KidsAttendancePage() {
  await requireLiveTool('cat', 'kidsatt')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl font-bold text-black">Kids Attendance</h1>
          <BatchImportButton />
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Tap a name to mark present or absent, or move a kid to a different class.
        </p>
        <KidsAttendanceBoard />
      </div>
    </div>
  )
}
