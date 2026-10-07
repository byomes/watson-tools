import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { requireLiveTool } from '@/lib/requireLiveTool'
import TrackerTabs from './TrackerTabs'
import { ThemeInitScript } from './ThemeInitScript'

// iOS reads appleWebApp.statusBarStyle once per Home Screen launch, so the in-app toggle
// can't move it live (see trackerTheme.ts). The theme cookie gets it right on the next launch.
export async function generateMetadata(): Promise<Metadata> {
  const theme = (await cookies()).get('tracker-theme')?.value
  return {
    title: 'Catalyst Tracker',
    appleWebApp: { statusBarStyle: theme === 'light' ? 'default' : 'black' },
    robots: { index: false, follow: false },
  }
}

// Never statically prerendered: the go-live gate is live DB state.
export const dynamic = 'force-dynamic'

export default async function TrackerPage() {
  await requireLiveTool('cat', 'tracker')
  return (
    <>
      <ThemeInitScript />
      <TrackerTabs />
    </>
  )
}
