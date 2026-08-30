import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import AttendanceBoard from './AttendanceBoard'

export const metadata: Metadata = {
  title: 'Attendance',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram (see src/lib/requireLiveTool.ts).
export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  await requireLiveTool('cat', 'attendance')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Sunday Attendance</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tap a name to mark present or absent. Changes save immediately.
        </p>
        <AttendanceBoard />
      </div>
    </div>
  )
}
