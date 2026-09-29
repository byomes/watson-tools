import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id, memberId } = await params
  const res = await watsonFetch(`/api/sms/groups/${id}/members/${memberId}`, {
    method: 'DELETE',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to remove group member' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
