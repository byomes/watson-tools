import { NextResponse } from 'next/server'
import { requireBooksSession } from '@/lib/booksAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireBooksSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const res = await watsonFetch('/api/books/lookup', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.BOOKS_API_KEY ?? '' },
    body: JSON.stringify(body ?? {}),
  })
  return NextResponse.json(await res.json().catch(() => ({ error: 'Bad response' })), { status: res.status })
}
