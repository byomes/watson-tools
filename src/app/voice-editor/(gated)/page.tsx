import type { Metadata } from 'next'
import Editor from './editor'
import entry from './entry1.json'

export const metadata: Metadata = {
  title: 'Voice Editor',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function SentenceEditPage() {
  return <Editor entry={entry} />
}
