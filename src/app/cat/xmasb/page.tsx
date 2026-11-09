import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/catalystdbAuth'
import XmasbBoard from './XmasbBoard'

export const metadata: Metadata = {
  title: 'Christmas Blessing',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Same Bill/Donna PIN session as /cat/events; the login bounces back here via ?next=.
export default async function XmasbPage() {
  if (!(await isLoggedIn())) redirect('/cat/catalystdb/login?next=/cat/xmasb')
  return <XmasbBoard />
}
