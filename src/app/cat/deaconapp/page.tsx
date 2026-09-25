import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getSession } from '@/lib/deaconAuth'
import { getShepherdingReport, computeShepherdingTotals } from '@/lib/shepherdingReport'
import DeaconAppTabs from './DeaconAppTabs'

// iOS only reads appleWebApp.statusBarStyle once, at the moment the Home
// Screen icon is launched -- it never live-updates while the app stays
// open, so the in-app dark/light toggle alone can never move it (see
// deaconTheme.ts). Reading the theme cookie here at least gets the status
// bar right on the *next* launch, matching whatever the deacon last chose.
export async function generateMetadata(): Promise<Metadata> {
  const theme = (await cookies()).get('deaconapp-theme')?.value
  return {
    title: 'Catalyst Shepherding App',
    appleWebApp: { title: 'Deacon', statusBarStyle: theme === 'light' ? 'default' : 'black' },
    robots: { index: false, follow: false },
  }
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and the session cookie makes this
// request-specific anyway).
export const dynamic = 'force-dynamic'

export default async function DeaconAppPage() {
  await requireLiveTool('cat', 'deaconapp')
  const deaconName = await getSession()
  if (!deaconName) redirect('/cat/deaconapp/login')

  // Fetched here (server-side, same call the standalone shepherdingreport
  // page makes) because it needs SHEPHERDING_REPORT_API_KEY, a server-only
  // secret — the Deacons and Attendance tabs fetch their own data
  // client-side against public /api/cat/* routes instead.
  const report = await getShepherdingReport()

  return (
    <DeaconAppTabs
      deaconName={deaconName}
      shepherdingGroups={report?.groups ?? null}
      shepherdingTotals={report ? computeShepherdingTotals(report.groups) : null}
      shepherdingDate={report?.generated_date ?? null}
    />
  )
}
