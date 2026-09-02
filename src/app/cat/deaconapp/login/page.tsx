import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/deaconAuth'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'Deacon App',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function DeaconAppLoginPage() {
  if (await getSession()) redirect('/cat/deaconapp')

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-bold text-black text-center mb-1">Deacon App</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Enter your PIN</p>
        <PinPad />
      </div>
    </div>
  )
}
