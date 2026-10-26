import type { Metadata } from 'next'
import { logoutAction } from '../catalystdb/actions'
import ThemeToggleButton from '../catalystdb/(gated)/ThemeToggleButton'
import { chmIdentity } from '@/lib/chmAuth'
import DashboardApp from './DashboardApp'

export const metadata: Metadata = {
  title: 'Catalyst Dashboard',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <polyline points="15 17 20 12 15 7" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default async function DashboardPage() {
  const who = await chmIdentity()
  return (
    <DashboardApp
      user={who?.user ?? ''}
      role={who?.role ?? 'admin'}
      themeToggle={<ThemeToggleButton />}
      logout={
        <form action={logoutAction}>
          <button type="submit" aria-label="Log out" title="Log out" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:opacity-60">
            <LogoutIcon />
          </button>
        </form>
      }
    />
  )
}
