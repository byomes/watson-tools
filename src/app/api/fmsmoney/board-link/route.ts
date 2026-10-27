import { NextRequest, NextResponse } from 'next/server'
import { fmsWatson, getFmsUser } from '@/lib/fmsAuth'

// Create / list / revoke the read-only board link. Signed-in only. The raw link token is returned once, when it is created.

async function forward(req: NextRequest) {
  const user = await getFmsUser()
  if (!user) return NextResponse.json({ error: 'login required' }, { status: 401 })
  const hasBody = req.method === 'POST'
  const res = await fmsWatson('board/links', {
    method: req.method,
    user,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(await req.json().catch(() => ({}))) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } })
}

export const GET = forward
export const POST = forward
export const DELETE = forward
