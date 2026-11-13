export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; reply: string; session_id?: string; first_token_ms?: number; latency_ms?: number; tokens?: number; cost_usd?: number; tools?: string[] }
  | { type: 'error'; message: string }

export function parseLines(buffer: string): { events: ChatEvent[]; rest: string } {
  const lines = buffer.split('\n')
  const rest = lines.pop() || ''
  const events: ChatEvent[] = []
  for (const line of lines) {
    try {
      const event = JSON.parse(line) as ChatEvent
      if (['token', 'tool', 'done', 'error'].includes(event.type)) events.push(event)
    } catch { /* Ignore incomplete or malformed lines. */ }
  }
  return { events, rest }
}

export function replyNote(event: Extract<ChatEvent, { type: 'done' }>): string {
  const first = ((event.first_token_ms ?? event.latency_ms ?? 0) / 1000).toFixed(1)
  const total = ((event.latency_ms ?? 0) / 1000).toFixed(1)
  const cost = typeof event.cost_usd === 'number' ? `$${event.cost_usd.toFixed(4)}` : 'cost unreported'
  const tools = event.tools?.length ? `, tools: ${event.tools.join(', ')}` : ''
  return `first token ${first}s, total ${total}s, ${event.tokens ?? 0} tokens, ${cost}${tools}`
}
