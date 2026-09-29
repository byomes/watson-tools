import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import BdayForm from './BdayForm'

export const metadata: Metadata = {
  title: 'Birthdays & Anniversaries',
  robots: { index: false, follow: false },
}

// Same reasoning as src/app/cat/connect/page.tsx -- the go-live gate is
// live DB state that can flip via Telegram at any moment, so this route
// must never be statically prerendered.
export const dynamic = 'force-dynamic'

export default async function BdayPage() {
  await requireLiveTool('cat', 'bday')

  return (
    <div className="min-h-screen bg-white py-16 px-8">
      <div className="max-w-2xl mx-auto">
        <BdayForm />
      </div>
    </div>
  )
}
