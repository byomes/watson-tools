import { NextResponse } from 'next/server'
import { fmsWatson, getFmsUser } from '@/lib/fmsAuth'

// The same data the public board link shows, for the signed-in user to check before sharing it.
export async function GET() {
  const user = await getFmsUser()
  if (!user) return NextResponse.json({ error: 'login required' }, { status: 401 })
  const res = await fmsWatson('board/preview', { user })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status, headers: { 'Cache-Control': 'no-store' } })
}
