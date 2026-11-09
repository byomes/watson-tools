import type { Metadata } from 'next'
import XmasbBoard from './XmasbBoard'

export const metadata: Metadata = {
  title: 'Christmas Blessing',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Open page (Bill, 2026-11-09): no login. Only family contact names and received times are exposed; no child or wish-list data.
export default function XmasbPage() {
  return <XmasbBoard />
}
