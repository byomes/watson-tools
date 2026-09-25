import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/shepcheckAuth'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'Shepherding Check-In',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ShepcheckLoginPage() {
  if (await isLoggedIn()) redirect('/cat/shepcheck')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-black dark:text-white text-center mb-1">
          Shepherding Check-In
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Elder PIN required</p>
        <PinPad />
      </div>
    </div>
  )
}
