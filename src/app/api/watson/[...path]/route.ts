import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Context = { params: Promise<{ path: string[] }> }

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params
  const valid = path.length === 1 && ['models', 'chats', 'chats-search', 'skills', 'uploads'].includes(path[0])
    || path.length === 2 && path[0] === 'identity' && path[1] === 'default'
    || path.length === 2 && path[0] === 'chats' && /^[a-f\d-]{36}$/i.test(path[1])
    || path.length === 2 && path[0] === 'uploads' && /^[a-f\d-]{36}$/i.test(path[1])
    || path.length === 1 && path[0] === 'chat'
  if (!valid) return Response.json({ error: 'Unknown Watson endpoint' }, { status: 404 })
  const base = process.env.VOICE_SERVER_URL || 'http://127.0.0.1:10040'
  const url = new URL(`/api/${path.join('/')}`, base)
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers: request.headers.get('content-type') ? { 'content-type': request.headers.get('content-type')! } : {},
      body: request.method === 'GET' ? undefined : request.body,
      duplex: 'half',
      cache: 'no-store',
      signal: request.signal,
    } as RequestInit & { duplex: 'half' })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
        ...(upstream.headers.get('content-disposition') ? { 'content-disposition': upstream.headers.get('content-disposition')! } : {}),
      },
    })
  } catch {
    return Response.json({ error: 'Could not reach Watson voice server' }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
