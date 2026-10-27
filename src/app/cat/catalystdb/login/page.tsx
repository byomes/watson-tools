import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/catalystdbAuth'
import { ThemeShell } from '../ThemeShell'
import PinPad from './pin-pad'

export const metadata: Metadata = {
  title: 'Catalyst Database',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CatalystDBLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; full?: string }> }) {
  const sp = await searchParams
  const elderPad = sp.next === '/cat/dashboard' && sp.full !== '1'
  if (await isLoggedIn()) redirect('/cat/catalystdb')

  return (
    <ThemeShell>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-8">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-1">
            Catalyst Database
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">{elderPad ? 'Enter your 4-digit PIN' : 'Enter the PIN'}</p>
          <PinPad length={elderPad ? 4 : 6} />
          {elderPad && (
            <a href="?next=/cat/dashboard&full=1" className="block text-center text-xs text-slate-400 mt-6 underline">Bill or Donna? Use the 6-digit PIN</a>
          )}
        </div>
      </div>
    </ThemeShell>
  )
}
