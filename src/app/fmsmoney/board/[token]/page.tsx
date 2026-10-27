import type { Metadata } from 'next'
import { fmsWatson } from '@/lib/fmsAuth'
import BoardReport, { type BoardData } from '../../BoardReport'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Board report', robots: { index: false, follow: false } }

// Read-only board report. The link itself is the key: long, unguessable, and revocable from the app. Shows totals only.
export default async function BoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = await fmsWatson('board/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <p className="text-sm text-center text-slate-600 dark:text-slate-300">This board report link is not active. Ask Bill for a new one.</p>
      </div>
    )
  }
  const d = (await res.json()) as BoardData
  return <BoardReport d={d} />
}
