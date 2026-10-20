import { NextRequest, NextResponse } from 'next/server'
import { GED_COOKIE, gedTokenUser } from '@/lib/gedAuth'

// Who is signed in to the GED coach ('' if the PIN was not tied to a person).
export async function GET(req: NextRequest) {
  const user = gedTokenUser(req.cookies.get(GED_COOKIE)?.value)
  return NextResponse.json({ user: user || '' }, { headers: { 'Cache-Control': 'no-store' } })
}
