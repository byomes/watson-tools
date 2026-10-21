import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/deaconAuth'
import { getShepherdingReport, computeShepherdingTotals } from '@/lib/shepherdingReport'
import DeaconAppTabs from '../deaconapp/DeaconAppTabs'
import { ThemeInitScript } from '../deaconapp/ThemeInitScript'

// Bill's personal copy of the Deacon App -- same PIN/session gate as
// /cat/deaconapp (deaconAuth's session cookie is path '/', so logging in
// there also logs you in here), but the shepherding tab's text icon opens
// the Watson SMS PWA (smsMode="webapp" below) instead of the stock
// Messages app, since Bill's public number is the SMS gateway's, not his
// personal cell. See generateMetadata in ../deaconapp/page.tsx for why the
// iOS status bar is read from the theme cookie here too.
export async function generateMetadata(): Promise<Metadata> {
  const theme = (await cookies()).get('deaconapp-theme')?.value
  return {
    title: 'My Shepherding App',
    appleWebApp: { title: 'My Deacon', statusBarStyle: theme === 'light' ? 'default' : 'black' },
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

export default async function DeaconAppBillPage() {
  const deaconName = await getSession()
  if (!deaconName) redirect('/cat/deaconapp/login')

  const report = await getShepherdingReport()

  return (
    <>
      <ThemeInitScript />
      <DeaconAppTabs
        deaconName={deaconName}
        shepherdingGroups={report?.groups ?? null}
        shepherdingTotals={report ? computeShepherdingTotals(report.groups) : null}
        shepherdingDate={report?.generated_date ?? null}
        smsMode="webapp"
      />
    </>
  )
}
