import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/smsAuth'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'Watson SMS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SmsLoginPage() {
  if (await isLoggedIn()) redirect('/sms')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-black dark:text-white text-center mb-1">
          Watson SMS
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Enter the PIN</p>
        <PinPad />
      </div>
    </div>
  )
}
