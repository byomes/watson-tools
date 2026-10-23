import type { Metadata } from 'next'
import Board from './Board'

export const metadata: Metadata = {
  title: 'Address Review',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <Board />
}
