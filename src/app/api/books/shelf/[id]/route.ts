import { NextResponse } from 'next/server'
import { requireBooksSession } from '@/lib/booksAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireBooksSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const res = await watsonFetch(`/api/books/shelf/${encodeURIComponent(id)}`, {
    headers: { 'X-Watson-Key': process.env.BOOKS_API_KEY ?? '' },
  })
  return NextResponse.json(await res.json().catch(() => ({ error: 'Bad response' })), { status: res.status })
}
