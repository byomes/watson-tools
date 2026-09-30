import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import KidsServantForm from './KidsServantForm'

export const metadata: Metadata = {
  title: 'Kids Servants Today',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function KidsTodayPage() {
  await requireLiveTool('cat', 'kidstoday')

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Kids Servants Today</h1>
        <p className="text-sm text-gray-500 mb-6">
          Update servant assignments for today&apos;s classes if different from the defaults.
        </p>
        <KidsServantForm />
      </div>
    </div>
  )
}
