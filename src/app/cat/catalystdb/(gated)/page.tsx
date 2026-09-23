import type { Metadata } from 'next'
import { getSession } from '@/lib/catalystdbAuth'
import { logoutAction } from '../actions'
import CatalystDBBoard from './CatalystDBBoard'
import ThemeToggleButton from './ThemeToggleButton'

export const metadata: Metadata = {
  title: 'Catalyst Database',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CatalystDBPage() {
  const name = await getSession()
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between gap-3 px-4 py-5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{name}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
            >
              Log out
            </button>
          </form>
        </div>
        <ThemeToggleButton />
      </div>
      <div className="flex-1 min-h-0">
        <CatalystDBBoard />
      </div>
    </div>
  )
}
