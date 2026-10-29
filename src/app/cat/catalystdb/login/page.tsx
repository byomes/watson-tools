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

export default async function CatalystDBLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isLoggedIn()) redirect('/cat/catalystdb')

  return (
    <ThemeShell>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-8">
        <div className="w-full max-w-xs">
          <img src="/9e9/mark.png" alt="9e9" className="mx-auto mb-2 h-20 w-auto" />
          <p className="mb-5 text-center text-sm italic text-nine">Know Every One.</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-1">
            Catalyst Database
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">Enter your 4-digit PIN</p>
          <PinPad length={4} />
        </div>
      </div>
    </ThemeShell>
  )
}
