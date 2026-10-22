import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/chiunitedAuth'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'ChiUnited Field Sheet',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ChiUnitedLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const dest = next === '/chi/notes' ? next : '/chiunited'
  if (await isLoggedIn()) redirect(dest)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-black dark:text-white text-center mb-1">
          ChiUnited Field Sheet
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Enter the PIN</p>
        <PinPad next={dest} />
      </div>
    </div>
  )
}
