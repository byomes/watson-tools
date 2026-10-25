import type { Metadata } from 'next'
import { isLoggedIn } from '@/lib/nailsAuth'
import NailsApp from './NailsApp'

export const metadata: Metadata = {
  title: 'Nails With Allie',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function NailsPage() {
  return <NailsApp unlocked={await isLoggedIn()} />
}
