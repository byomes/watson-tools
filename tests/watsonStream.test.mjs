import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLines, replyNote } from '../src/app/watson/stream.ts'

test('parses split newline-delimited events and keeps an incomplete tail', () => {
  const first = parseLines('{"type":"token","text":"Hi"}\n{"type":"do')
  assert.deepEqual(first.events, [{ type: 'token', text: 'Hi' }])
  const second = parseLines(first.rest + 'ne","reply":"Hi","latency_ms":1200}\n')
  assert.equal(second.events[0].type, 'done')
  assert.equal(second.events[0].reply, 'Hi')
  assert.equal(second.rest, '')
})

test('ignores malformed lines and formats the iPhone timing note', () => {
  assert.deepEqual(parseLines('bad\n{"type":"other"}\n').events, [])
  assert.equal(replyNote({ type: 'done', reply: 'ok', first_token_ms: 500, latency_ms: 1500, tokens: 42, cost_usd: 0.0012, tools: ['watson_status'] }), 'first token 0.5s, total 1.5s, 42 tokens, $0.0012, tools: watson_status')
})
