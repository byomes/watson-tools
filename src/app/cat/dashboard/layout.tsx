import type { Viewport } from 'next'
import { redirect } from 'next/navigation'
import { hasDashboardSession } from '@/lib/chmElderAuth'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#219f40' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
}

// Same Bill/Donna PIN session as the Catalyst Database; the login page sends people back here.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasDashboardSession())) redirect('/cat/catalystdb/login?next=/cat/dashboard')
  return <div className="bg-white dark:bg-slate-950">{children}</div>
}
