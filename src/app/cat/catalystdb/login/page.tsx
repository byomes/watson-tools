import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Catalyst Database',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// The PIN login is gone (Bill, 2026-11-09). Old bookmarks and ?next= links land on the tool.
export default async function CatalystDBLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  redirect(next && next.startsWith('/cat/') ? next : '/cat/catalystdb')
}
