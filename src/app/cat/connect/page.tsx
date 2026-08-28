import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import ConnectCardForm from './ConnectCardForm'

export const metadata: Metadata = {
  title: 'Connect Card',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state that can
// flip at any moment via Telegram, and relying on fetch-cache inference
// alone (cache: 'no-store' inside requireLiveTool) is too fragile for a
// static-path route with no params to force dynamic rendering on its own.
export const dynamic = 'force-dynamic'

export default async function ConnectCardPage() {
  await requireLiveTool('cat', 'connect')

  return (
    <div className="min-h-screen bg-white py-16 px-8">
      <div className="max-w-2xl mx-auto">
        <ConnectCardForm />
      </div>
    </div>
  )
}
