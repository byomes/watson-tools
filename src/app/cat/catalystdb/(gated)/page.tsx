import type { Metadata } from 'next'
import { getSession } from '@/lib/catalystdbAuth'
import { logoutAction } from '../actions'
import CatalystDBBoard from './CatalystDBBoard'

export const metadata: Metadata = {
  title: 'Catalyst Database',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CatalystDBPage() {
  const name = await getSession()
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-end gap-3 px-4 py-1 bg-slate-950 shrink-0">
        <span className="text-xs text-slate-400">{name}</span>
        <form action={logoutAction}>
          <button type="submit" className="text-xs text-slate-400 hover:text-white underline">
            Log out
          </button>
        </form>
      </div>
      <div className="flex-1 min-h-0">
        <CatalystDBBoard />
      </div>
    </div>
  )
}
