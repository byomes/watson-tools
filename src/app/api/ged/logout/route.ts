import { NextResponse } from 'next/server'
import { GED_COOKIE } from '@/lib/gedAuth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(GED_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
