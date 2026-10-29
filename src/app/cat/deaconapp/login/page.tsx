import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/deaconAuth'
import { ThemeShell } from '../ThemeShell'
import { ThemeInitScript } from '../ThemeInitScript'
import PinPad from './pin-pad'

// See generateMetadata in cat/deaconapp/page.tsx for why this reads the
// theme cookie instead of a static export -- the iOS status bar on the
// Home Screen icon only picks up statusBarStyle at launch.
export async function generateMetadata(): Promise<Metadata> {
  const theme = (await cookies()).get('deaconapp-theme')?.value
  return {
    title: 'Catalyst Shepherding App',
    appleWebApp: { title: 'Deacon', statusBarStyle: theme === 'light' ? 'default' : 'black' },
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

export default async function DeaconAppLoginPage() {
  if (await getSession()) redirect('/cat/deaconapp')

  return (
    <ThemeShell>
      <ThemeInitScript />
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
        <div className="w-full max-w-xs">
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/9e9/mark.png" alt="9e9" className="h-16 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-black dark:text-white text-center mb-1">Shepherding App</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Enter your PIN</p>
          <PinPad />
        </div>
      </div>
    </ThemeShell>
  )
}
