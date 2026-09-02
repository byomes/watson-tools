import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getSession } from '@/lib/deaconAuth'
import { getShepherdingReport, computeShepherdingTotals } from '@/lib/shepherdingReport'
import DeaconAppTabs from './DeaconAppTabs'

export const metadata: Metadata = {
  title: 'Deacon App',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and the session cookie makes this
// request-specific anyway).
export const dynamic = 'force-dynamic'

export default async function DeaconAppPage() {
  await requireLiveTool('cat', 'deaconapp')
  if (!(await getSession())) redirect('/cat/deaconapp/login')

  // Fetched here (server-side, same call the standalone shepherdingreport
  // page makes) because it needs SHEPHERDING_REPORT_API_KEY, a server-only
  // secret — the Deacons and Attendance tabs fetch their own data
  // client-side against public /api/cat/* routes instead.
  const report = await getShepherdingReport()

  return (
    <DeaconAppTabs
      shepherdingGroups={report?.groups ?? null}
      shepherdingTotals={report ? computeShepherdingTotals(report.groups) : null}
      shepherdingDate={report?.generated_date ?? null}
    />
  )
}
