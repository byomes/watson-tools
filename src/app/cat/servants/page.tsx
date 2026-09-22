import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import ServantsBoard from './ServantsBoard'

export const metadata: Metadata = {
  title: 'Catalyst Servant Leaders',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram (see src/lib/requireLiveTool.ts).
export const dynamic = 'force-dynamic'

export default async function ServantsPage() {
  await requireLiveTool('cat', 'servants')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Catalyst Servant Leaders</h1>
        <p className="text-sm text-gray-500 mb-6">
          Please review your team below and confirm everyone&apos;s role and serving start date are correct.
          Tap a person&apos;s name to edit their role or serving date. If someone&apos;s missing, use Add
          Person to add them. If someone is no longer serving, tap the{' '}
          <span className="inline-flex items-center justify-center w-4 h-4 rounded border-2 border-red-600 bg-white text-red-600 text-[10px] font-bold align-middle">
            ✕
          </span>{' '}
          next to their name.
        </p>
        <ServantsBoard />
      </div>
    </div>
  )
}
