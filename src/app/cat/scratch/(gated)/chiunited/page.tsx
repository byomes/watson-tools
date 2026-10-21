import type { Metadata } from 'next'
import FieldSheet from './FieldSheet'

export const metadata: Metadata = {
  title: 'ChiUnited Field Sheet',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function ChiUnitedFieldPage() {
  return <FieldSheet />
}
