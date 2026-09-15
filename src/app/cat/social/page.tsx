import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { isLoggedIn } from '@/lib/socialAuth'
import { logoutAction } from './actions'
import SocialDashboard from './SocialDashboard'

export const metadata: Metadata = {
  title: 'Catalyst Social',
  robots: { index: false, follow: false },
}

// Never statically prerendered — the go-live gate is live DB state, and the
// queue/status data is live too (see /cat/attendance's identical reasoning).
export const dynamic = 'force-dynamic'

export default async function SocialPage() {
  await requireLiveTool('cat', 'social')
  if (!(await isLoggedIn())) redirect('/cat/social/login')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-black dark:text-white">Catalyst Social</h1>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 underline">
              Log out
            </button>
          </form>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Schedule and review posts to the church&apos;s Facebook and Instagram.
        </p>
        <SocialDashboard />
      </div>
    </div>
  )
}
