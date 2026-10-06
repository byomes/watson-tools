import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession, getSessionToken } from '@/lib/deaconAuth'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'connection'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Names every active member with their attendance/serving activity: needs a
  // real deacon-app session, checked again by Watson (X-Deacon-Session).
  const sessionToken = await getSessionToken()
  if (!(await getSession()) || !sessionToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const days = req.nextUrl.searchParams.get('days') ?? '90'
  const res = await watsonFetch(`/api/cat/connection/state?days=${encodeURIComponent(days)}`, {
    headers: { 'X-Watson-Key': process.env.CONNECTION_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load' }, { status: res.status === 401 ? 401 : 502 })
  return NextResponse.json(await res.json())
}
