import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/catalystdbAuth'
import AttSchedBoard from './AttSchedBoard'

export const metadata: Metadata = {
  title: 'Attendance Rules',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Same Bill/Donna PIN session as /cat/catalystdb; the login bounces back here via ?next=.
export default async function AttSchedPage() {
  if (!(await isLoggedIn())) redirect('/cat/catalystdb/login?next=/cat/attsched')
  return <AttSchedBoard />
}
