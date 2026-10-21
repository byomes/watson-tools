import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/catalystdbAuth'
import EventsBoard from './EventsBoard'

export const metadata: Metadata = {
  title: 'Events',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Same Bill/Donna PIN session as /cat/catalystdb; the login bounces back here via ?next=.
export default async function EventsPage() {
  if (!(await isLoggedIn())) redirect('/cat/catalystdb/login?next=/cat/events')
  return <EventsBoard />
}
