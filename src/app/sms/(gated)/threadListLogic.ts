export type ThreadFilter = 'all' | 'unread' | 'groups' | 'unknown'

export type ListThread = {
  id: number
  phone: string
  contact_name: string | null
  member_id: number | null
  is_group: boolean
  unread: number
  draft_text: string | null
  last_message_preview: string | null
}

export function isUnknownNumber(thread: ListThread): boolean {
  return !thread.is_group && !thread.contact_name && !thread.member_id
}

export function selectThreads<T extends ListThread>(threads: T[], filter: ThreadFilter, query: string, pinnedIds: number[], displayName: (thread: T) => string): T[] {
  const search = query.trim().toLowerCase()
  const pins = new Set(pinnedIds)
  return threads
    .filter((thread) => {
      if (filter === 'unread' && !thread.unread) return false
      if (filter === 'groups' && !thread.is_group) return false
      if (filter === 'unknown' && !isUnknownNumber(thread)) return false
      return !search || displayName(thread).toLowerCase().includes(search) || (thread.last_message_preview ?? '').toLowerCase().includes(search)
    })
    .sort((a, b) => Number(pins.has(b.id)) - Number(pins.has(a.id)) || Number(Boolean(b.unread || b.draft_text)) - Number(Boolean(a.unread || a.draft_text)))
}
