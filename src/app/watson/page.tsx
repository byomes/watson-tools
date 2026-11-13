import type { Metadata } from 'next'
import WatsonBar from '../cat/WatsonBar'
import WatsonChat from './WatsonChat'

export const metadata: Metadata = { title: 'Watson Chat', robots: { index: false, follow: false } }

export default function Page() {
  return <><WatsonBar /><WatsonChat /></>
}
