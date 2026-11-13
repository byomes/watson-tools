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
