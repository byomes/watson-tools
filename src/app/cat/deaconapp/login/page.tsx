import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/deaconAuth'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'Catalyst Shepherding App',
  appleWebApp: { title: 'Deacon' },
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function DeaconAppLoginPage() {
  if (await getSession()) redirect('/cat/deaconapp')

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-black text-center mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/catalyst-c-logo.jpg" alt="" className="h-6 w-6 rounded-md shrink-0" />
          Catalyst Shepherding App
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">Enter your PIN</p>
        <PinPad />
      </div>
    </div>
  )
}
