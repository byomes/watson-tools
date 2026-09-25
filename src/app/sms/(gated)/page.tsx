import type { Metadata } from 'next'
import { logoutAction } from '../actions'
import SmsApp from './SmsApp'

export const metadata: Metadata = {
  title: 'Watson SMS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function SmsIndexPage() {
  return <SmsApp logoutAction={logoutAction} />
}
