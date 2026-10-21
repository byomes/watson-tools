import type { Metadata } from 'next'
import Editor from './editor'
import { ENTRIES, ENTRY_COUNT } from './entries'

export const metadata: Metadata = {
  title: 'Voice Editor',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SentenceEditPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams
  const n = Math.min(ENTRY_COUNT, Math.max(1, parseInt(e ?? '1', 10) || 1))
  // key remounts the editor so each entry loads its own saved state.
  return <Editor key={n} entry={ENTRIES[n - 1]} n={n} total={ENTRY_COUNT} />
}
