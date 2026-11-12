'use client'

import { useRef, useState } from 'react'
import { isUnknownNumber, type ListThread, type ThreadFilter } from './threadListLogic'

type Thread = ListThread & {
  last_message_at: string | null
  muted: boolean
  snoozed_until: string | null
  highlight_note: string | null
  state: 'open' | 'archived'
  participants: { phone: string; contact_name: string | null }[]
  group_name: string | null
}
type Colors = { line: string; ink: string; inkSoft: string; moss: string; clay: string; claySoft: string; tagblueSoft: string; surface: string }

function oneHourFromNow(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

export function ThreadFilters({ value, onChange, colors }: { value: ThreadFilter; onChange: (value: ThreadFilter) => void; colors: Colors }) {
  const choices: { value: ThreadFilter; label: string }[] = [
    { value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' },
    { value: 'groups', label: 'Groups' }, { value: 'unknown', label: 'Unknown numbers' },
  ]
  return <div className="flex gap-2 overflow-x-auto px-5 pb-3" aria-label="Conversation filters">
    {choices.map((choice) => <button key={choice.value} type="button" aria-pressed={value === choice.value} onClick={() => onChange(choice.value)} className="flex-none rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: value === choice.value ? colors.moss : colors.line, background: value === choice.value ? colors.moss : colors.surface, color: value === choice.value ? 'white' : colors.ink }}>{choice.label}</button>)}
  </div>
}

export function ThreadRow({ thread, pinned, colors, displayName, fmtTime, previewText, onOpen, onPin, onPatch, onAddContact }: {
  thread: Thread; pinned: boolean; colors: Colors; displayName: (thread: Thread) => string
  fmtTime: (value: string | null) => string; previewText: (value: string | null) => string | null
  onOpen: () => void; onPin: () => void
  onPatch: (patch: { unread?: number; muted?: boolean; snoozed_until?: string | null; state?: 'open' | 'archived' }) => void
  onAddContact: () => void
}) {
  const [side, setSide] = useState<'left' | 'right' | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  function touchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!start.current) return
    const dx = event.changedTouches[0].clientX - start.current.x
    const dy = event.changedTouches[0].clientY - start.current.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      setSide(dx > 0 ? 'right' : 'left')
      event.preventDefault()
      event.stopPropagation()
    }
    start.current = null
  }
  function action(label: string, run: () => void) {
    return <button type="button" className="rounded-lg border px-2 py-1.5 text-xs font-medium" style={{ borderColor: colors.line, color: colors.ink, background: colors.surface }} onClick={() => { run(); setSide(null) }}>{label}</button>
  }
  function toggleSnooze() {
    onPatch({ snoozed_until: thread.snoozed_until ? null : oneHourFromNow() })
  }
  return <div className="border-b" style={{ borderColor: colors.line }} onTouchStart={(event) => { start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={touchEnd}>
    <button type="button" onClick={onOpen} className="w-full text-left px-5 py-3 flex items-start gap-3" style={{ background: thread.highlight_note ? colors.claySoft : thread.unread ? colors.tagblueSoft : 'transparent', boxShadow: thread.highlight_note ? `inset 3px 0 0 0 ${colors.clay}` : thread.unread ? `inset 3px 0 0 0 ${colors.moss}` : undefined }}>
      <div className="w-11 h-11 rounded-full flex-none flex items-center justify-center text-white text-sm font-semibold" style={{ background: colors.moss }}>{displayName(thread).slice(0, 2).toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`inline-flex items-center gap-1 min-w-0 text-sm ${thread.unread ? 'font-bold' : 'font-medium'}`}>
            {pinned && <span aria-label="Pinned" title="Pinned">📌</span>}
            {thread.muted && <span aria-label="Muted" title="Muted">🔕</span>}
            {thread.snoozed_until && <span aria-label="Snoozed" title="Snoozed">◷</span>}
            <span className="truncate">{displayName(thread)}</span>
          </span>
          <span className="text-xs flex-none font-mono" style={{ color: thread.unread ? colors.moss : colors.inkSoft }}>{fmtTime(thread.last_message_at)}</span>
        </div>
        {thread.highlight_note && <div className="text-xs font-semibold mb-0.5" style={{ color: colors.clay }}>{thread.highlight_note}</div>}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${thread.unread ? 'font-semibold' : ''}`} style={{ color: thread.unread ? colors.ink : colors.inkSoft }}>
            {thread.draft_text ? <><strong style={{ color: colors.clay }}>Draft</strong> · {thread.draft_text}</> : previewText(thread.last_message_preview)}
          </span>
          {!!thread.unread && <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: colors.moss }} />}
        </div>
      </div>
    </button>
    {side && <div className="flex flex-wrap gap-2 px-5 pb-2" aria-label="Conversation actions">
      {side === 'right' ? <>{action(pinned ? 'Unpin' : 'Pin', onPin)}{thread.unread ? action('Mark read', () => onPatch({ unread: 0 })) : null}</> : <>
        {action(thread.muted ? 'Unmute' : 'Mute', () => onPatch({ muted: !thread.muted }))}
        {action(thread.snoozed_until ? 'Clear snooze' : 'Snooze 1 hour', toggleSnooze)}
        {action(thread.state === 'archived' ? 'Unarchive' : 'Archive', () => onPatch({ state: thread.state === 'archived' ? 'open' : 'archived' }))}
      </>}
      {action('Close', () => {})}
    </div>}
    {isUnknownNumber(thread) && <div className="px-5 pb-2"><button type="button" onClick={onAddContact} className="text-xs font-medium" style={{ color: colors.moss }}>+ Add Contact</button></div>}
  </div>
}
