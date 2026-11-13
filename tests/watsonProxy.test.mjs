import assert from 'node:assert/strict'
import test from 'node:test'
import { GET, POST } from '../src/app/api/watson/[...path]/route.ts'

test('proxies chat chunks without reading the upstream body first', async () => {
  const original = globalThis.fetch
  let release
  const gate = new Promise(resolve => { release = resolve })
  let upstreamRequest
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url: String(url), init }
    return new Response(new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('{"type":"token","text":"Hi"}\n'))
        await gate
        controller.enqueue(new TextEncoder().encode('{"type":"done","reply":"Hi"}\n'))
        controller.close()
      },
    }), { headers: { 'content-type': 'application/x-ndjson' } })
  }
  try {
    const request = new Request('http://localhost/api/watson/chat', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
    const response = await POST(request, { params: Promise.resolve({ path: ['chat'] }) })
    assert.equal(response.headers.get('content-type'), 'application/x-ndjson')
    assert.equal(upstreamRequest.url, 'http://127.0.0.1:10040/api/chat')
    const reader = response.body.getReader()
    const first = await reader.read()
    assert.match(new TextDecoder().decode(first.value), /"token"/)
    release()
    const second = await reader.read()
    assert.match(new TextDecoder().decode(second.value), /"done"/)
  } finally { release(); globalThis.fetch = original }
})

test('rejects paths outside the chat API without an upstream call', async () => {
  const response = await GET(new Request('http://localhost/api/watson/private'), { params: Promise.resolve({ path: ['private'] }) })
  assert.equal(response.status, 404)
})

test('streams multipart upload bytes and returns raw uploaded files', async () => {
  const original = globalThis.fetch
  const bytes = new Uint8Array([0, 255, 23, 10])
  let received
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/uploads')) {
      received = new Uint8Array(await new Response(init.body).arrayBuffer())
      assert.match(init.headers['content-type'], /^multipart\/form-data; boundary=/)
      return Response.json({ id: 'uploaded' })
    }
    return new Response(bytes, { headers: { 'content-type': 'image/png', 'content-disposition': 'inline; filename="photo.png"' } })
  }
  try {
    const body = new FormData()
    body.append('file', new Blob([bytes], { type: 'image/png' }), 'photo.png')
    const upload = await POST(new Request('http://localhost/api/watson/uploads', { method: 'POST', body }), { params: Promise.resolve({ path: ['uploads'] }) })
    assert.equal(upload.status, 200)
    assert.ok(received.includes(255))
    const file = await GET(new Request('http://localhost/api/watson/uploads/12345678-1234-1234-1234-123456789abc'), { params: Promise.resolve({ path: ['uploads', '12345678-1234-1234-1234-123456789abc'] }) })
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes)
    assert.equal(file.headers.get('content-type'), 'image/png')
    assert.equal(file.headers.get('content-disposition'), 'inline; filename="photo.png"')
  } finally { globalThis.fetch = original }
})

test('allows the skills endpoint', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => Response.json({ skills: [] })
  try {
    const result = await GET(new Request('http://localhost/api/watson/skills'), { params: Promise.resolve({ path: ['skills'] }) })
    assert.deepEqual(await result.json(), { skills: [] })
  } finally { globalThis.fetch = original }
})
