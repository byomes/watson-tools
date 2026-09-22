import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import ServingBoard from './ServingBoard'

export const metadata: Metadata = {
  title: 'Who Served Sunday',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram (see src/lib/requireLiveTool.ts).
export const dynamic = 'force-dynamic'

export default async function ServingPage() {
  await requireLiveTool('cat', 'serving')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Who Served Sunday</h1>
        <p className="text-sm text-gray-500 mb-6">
          Find your team below and check off everyone who actually served that Sunday. Changes save immediately.
        </p>
        <ServingBoard />
      </div>
    </div>
  )
}
