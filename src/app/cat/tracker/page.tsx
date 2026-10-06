import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import TrackerTabs from './TrackerTabs'

export const metadata: Metadata = {
  title: 'Catalyst Tracker',
  robots: { index: false, follow: false },
}

// Never statically prerendered: the go-live gate is live DB state.
export const dynamic = 'force-dynamic'

export default async function TrackerPage() {
  await requireLiveTool('cat', 'tracker')
  return <TrackerTabs />
}
