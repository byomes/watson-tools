import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { MessageStatus } from './MessageStatus'

type Message = {
  id: number; direction: 'in' | 'out'; body: string; media_url: string | null
  status: 'sending' | 'stalled' | 'sent' | 'delivered' | 'failed' | null; sender_name: string | null; sender_phone: string | null
}
type Colors = { moss: string; surfaceAlt: string; ink: string; inkSoft: string; line: string; clay: string }

function highlightedBody(body: string, query: string) {
  const parts: ReactNode[] = []
  const lower = body.toLocaleLowerCase()
  const needle = query.toLocaleLowerCase()
  let start = 0
  let index = lower.indexOf(needle)
  while (index !== -1) {
    parts.push(body.slice(start, index))
    parts.push(<mark key={index} className="rounded-sm bg-yellow-300 text-black">{body.slice(index, index + needle.length)}</mark>)
    start = index + needle.length
    index = lower.indexOf(needle, start)
  }
  parts.push(body.slice(start))
  return parts
}

export function ThreadMessages({ messages, phone, isGroup, colors, scrollRef, renderBody, onImageLoad }: {
  messages: Message[]; phone: string; isGroup: boolean; colors: Colors
  scrollRef: RefObject<HTMLDivElement | null>; renderBody: (message: Message) => ReactNode; onImageLoad: () => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const matches = query.trim() ? messages.filter((message) => message.body.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : messages
  const stopTimer = () => { if (timer.current) clearTimeout(timer.current) }
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setMenuId(null) } catch { /* Clipboard unavailable */ }
  }

  return <>
    <div className="flex-none px-4 py-1 border-b" style={{ borderColor: colors.line }}>
      {searchOpen ? <div className="flex items-center gap-2">
        <input autoFocus aria-label="Search this thread" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this thread" className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-sm"
          style={{ background: colors.surfaceAlt, borderColor: colors.line, color: colors.ink }} />
        <span className="text-xs" style={{ color: colors.inkSoft }}>{query.trim() ? `${matches.length} found` : ''}</span>
        <button type="button" onClick={() => { setSearchOpen(false); setQuery('') }} className="text-xs" style={{ color: colors.moss }}>Done</button>
      </div> : <button type="button" onClick={() => setSearchOpen(true)} className="text-xs" style={{ color: colors.moss }}>Search thread</button>}
    </div>
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2">
      {matches.map((message) => {
        const number = message.direction === 'in' ? (message.sender_phone || (!isGroup ? phone : '')) : (!isGroup ? phone : '')
        return <div key={message.id} className="flex flex-col gap-0.5" style={{ alignItems: message.direction === 'out' ? 'flex-end' : 'flex-start' }}>
          {isGroup && message.direction === 'in' && <span className="text-xs font-semibold px-1" style={{ color: colors.inkSoft }}>
            {message.sender_name || message.sender_phone || 'Someone in this group'}
          </span>}
          <div className="max-w-[75%]" onTouchStart={() => { stopTimer(); timer.current = setTimeout(() => setMenuId(message.id), 550) }}
            onTouchEnd={stopTimer} onTouchMove={stopTimer}
            onContextMenu={(event) => { event.preventDefault(); setMenuId(message.id) }}>
            <div className="px-3.5 py-2 rounded-2xl text-base leading-snug flex flex-col gap-1.5"
              style={message.direction === 'out' ? { background: colors.moss, color: 'white' } : { background: colors.surfaceAlt, color: colors.ink }}>
              {message.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={message.media_url} alt="Attachment" className="rounded-lg max-w-full" onLoad={onImageLoad} />
              )}
              {message.body && <span className="whitespace-pre-wrap break-words">{query.trim() ? highlightedBody(message.body, query.trim()) : renderBody(message)}</span>}
            </div>
            {menuId === message.id && <div className="flex gap-2 mt-1 rounded-lg border p-1 text-xs" style={{ borderColor: colors.line, background: colors.surfaceAlt, color: colors.ink }}>
              <button type="button" onClick={() => copy(message.body)} disabled={!message.body} className="px-2 py-1 disabled:opacity-40">Copy text</button>
              {number && <button type="button" onClick={() => copy(number)} className="px-2 py-1">Copy phone number</button>}
              <button type="button" onClick={() => setMenuId(null)} className="px-2 py-1">Close</button>
            </div>}
          </div>
          <MessageStatus direction={message.direction} status={message.status} colors={colors} />
        </div>
      })}
      {query.trim() && matches.length === 0 && <div className="text-center text-sm" style={{ color: colors.inkSoft }}>No matching messages</div>}
    </div>
  </>
}
