'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSmsTheme } from '@/lib/useSmsTheme'
import { useSmsPush } from '@/lib/useSmsPush'

type Thread = {
  id: number
  phone: string
  contact_name: string | null
  member_id: number | null
  last_message_preview: string | null
  last_message_at: string | null
  unread: number
  state: 'open' | 'archived'
  muted: boolean
  snoozed_until: string | null
}
type Message = {
  id: number
  direction: 'in' | 'out'
  body: string
  created_at: string
  media_url: string | null
  media_type: string | null
  status: 'sent' | 'delivered' | 'failed' | null
}
type ScheduledMessage = { id: number; body: string; send_at: string; status: 'pending' | 'failed'; error: string | null }
type Template = { id: string; label: string; body: string; updated_at: string }
type SearchHit = { message_id: number; thread_id: number; body: string; created_at: string; contact_name: string | null; phone: string }
type Contact = { id: number; name: string; phone: string }
type Context = {
  matched: boolean
  name?: string
  campus_preference?: string | null
  first_visit_date?: string | null
  deacon?: string | null
  last_attended_summary?: string
  household?: { name: string; household_role: string | null }[]
}

type View = 'list' | 'thread' | 'templates'

const CONTEXT_FIELDS = [
  { key: 'last_attended', label: 'Last attended' },
  { key: 'household', label: 'Household' },
  { key: 'deacon', label: 'Deacon' },
  { key: 'campus', label: 'Campus preference' },
  { key: 'first_visit', label: 'First visit date' },
] as const
type ContextFieldKey = (typeof CONTEXT_FIELDS)[number]['key']

function loadContextSettings(): Record<ContextFieldKey, boolean> {
  const all = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, true])) as Record<ContextFieldKey, boolean>
  try {
    const raw = localStorage.getItem('sms_context_fields')
    if (!raw) return all
    return { ...all, ...JSON.parse(raw) }
  } catch {
    return all
  }
}

const LIGHT_COLORS = {
  moss: '#3B6A4C',
  mossStrong: '#2A4E37',
  clay: '#AD5F1B',
  claySoft: '#F3E2CE',
  tagblue: '#3C5C89',
  tagblueSoft: '#DCE5F1',
  neutral: '#5C6D63',
  neutralSoft: '#E3E7E0',
  line: '#D6DCD1',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEFE7',
  bg: '#F7F9F5',
  ink: '#1C2420',
  inkSoft: '#5A665C',
}

const DARK_COLORS = {
  moss: '#6EA47C',
  mossStrong: '#8BC299',
  clay: '#DE8F41',
  claySoft: '#31240F',
  tagblue: '#7FA1D4',
  tagblueSoft: '#1B2739',
  neutral: '#9CA89D',
  neutralSoft: '#212A22',
  line: '#2C362D',
  surface: '#181F19',
  surfaceAlt: '#212A22',
  bg: '#0F130F',
  ink: '#E7ECE3',
  inkSoft: '#9BA89C',
}

type Palette = typeof LIGHT_COLORS

function fraunces(extra = '') {
  return `font-[family-name:var(--font-fraunces)] ${extra}`
}
function mono(extra = '') {
  return `font-[family-name:var(--font-plex-mono)] ${extra}`
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtScheduled(utc: string): string {
  const d = new Date(utc.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return utc
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `today ${time}`
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`
}

function draftKey(id: number): string {
  return `sms_draft_${id}`
}
function loadDraft(id: number): string {
  try {
    return localStorage.getItem(draftKey(id)) || ''
  } catch {
    return ''
  }
}
function saveDraft(id: number, text: string): void {
  try {
    if (text) localStorage.setItem(draftKey(id), text)
    else localStorage.removeItem(draftKey(id))
  } catch {
    // localStorage unavailable (private mode etc) -- draft just won't persist
  }
}

function displayName(t: Thread): string {
  return t.contact_name || t.phone
}

function firstName(t: Thread | null): string {
  if (!t?.contact_name) return '{first_name}'
  return t.contact_name.split(' ')[0]
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json()
}

export default function SmsApp({ logoutAction }: { logoutAction: () => void }) {
  const [theme, toggleTheme] = useSmsTheme()
  const { status: pushStatus, errorDetail: pushErrorDetail, stage: pushStage, enable: enablePush, disable: disablePush } = useSmsPush()
  const [showPushInfo, setShowPushInfo] = useState(false)
  const COLORS: Palette = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS
  const [view, setView] = useState<View>('list')
  const [threads, setThreads] = useState<Thread[]>([])
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [compose, setCompose] = useState('')
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [injectOpen, setInjectOpen] = useState(false)
  const [injectPhone, setInjectPhone] = useState('')
  const [injectName, setInjectName] = useState('')
  const [injectText, setInjectText] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composePhone, setComposePhone] = useState('')
  const [composeName, setComposeName] = useState('')
  const [composeText, setComposeText] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeContacts, setComposeContacts] = useState<Contact[]>([])
  const [composeContactPicked, setComposeContactPicked] = useState(false)
  const [composeShowSchedule, setComposeShowSchedule] = useState(false)
  const [composeScheduleAt, setComposeScheduleAt] = useState('')
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedThreads, setArchivedThreads] = useState<Thread[]>([])
  const [searchHits, setSearchHits] = useState<SearchHit[]>([])
  const [context, setContext] = useState<Context | null>(null)
  const [showSnooze, setShowSnooze] = useState(false)
  const [snoozeAt, setSnoozeAt] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [contextFields, setContextFields] = useState<Record<ContextFieldKey, boolean>>(() =>
    Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, true])) as Record<ContextFieldKey, boolean>,
  )
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null)
  const [editingScheduledId, setEditingScheduledId] = useState<number | null>(null)

  useEffect(() => {
    setContextFields(loadContextSettings())
  }, [])

  function saveContextFields(next: Record<ContextFieldKey, boolean>) {
    setContextFields(next)
    try {
      localStorage.setItem('sms_context_fields', JSON.stringify(next))
    } catch {
      // localStorage unavailable (private mode etc) -- setting just won't persist
    }
  }

  const isDev = process.env.NODE_ENV !== 'production'

  const activeThread = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId])

  async function loadThreads() {
    const data = await api<{ threads: Thread[] }>('/api/sms/threads')
    setThreads(data.threads)
  }

  async function loadTemplates() {
    const data = await api<{ templates: Template[] }>('/api/sms/templates')
    setTemplates(data.templates)
  }

  async function refreshActiveMessages(id: number) {
    const data = await api<{ thread: Thread; messages: Message[] }>(`/api/sms/threads/${id}/messages`)
    setMessages(data.messages)
  }

  async function loadScheduled(id: number) {
    const data = await api<{ scheduled: ScheduledMessage[] }>(`/api/sms/threads/${id}/scheduled`)
    setScheduled(data.scheduled)
  }

  async function loadArchived() {
    const data = await api<{ threads: Thread[] }>('/api/sms/threads?archived=1')
    setArchivedThreads(data.threads)
  }

  async function patchThread(id: number, patch: Partial<Pick<Thread, 'state' | 'muted' | 'snoozed_until'>>) {
    const data = await api<{ thread: Thread }>(`/api/sms/threads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setThreads((prev) => prev.map((t) => (t.id === id ? data.thread : t)).filter((t) => t.state !== 'archived'))
    setArchivedThreads((prev) => {
      const withoutIt = prev.filter((t) => t.id !== id)
      return data.thread.state === 'archived' ? [...withoutIt, data.thread] : withoutIt
    })
    return data.thread
  }

  async function loadContext(id: number) {
    const data = await api<Context>(`/api/sms/threads/${id}/context`)
    setContext(data)
  }

  async function searchAcrossMessages(q: string) {
    if (!q.trim()) {
      setSearchHits([])
      return
    }
    const data = await api<{ results: SearchHit[] }>(`/api/sms/search?q=${encodeURIComponent(q.trim())}`)
    setSearchHits(data.results)
  }

  useEffect(() => {
    Promise.all([loadThreads(), loadTemplates()])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounced so a full search query doesn't fire one request per keystroke.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSearchHits([])
      return
    }
    const timer = setTimeout(() => {
      searchAcrossMessages(q).catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Contact-picker autocomplete on the compose window's Name field --
  // suppressed right after a pick so selecting a contact doesn't
  // immediately reopen its own dropdown.
  useEffect(() => {
    if (!composeOpen || composeContactPicked || !composeName.trim()) {
      setComposeContacts([])
      return
    }
    const timer = setTimeout(() => {
      api<{ contacts: Contact[] }>(`/api/sms/contacts?q=${encodeURIComponent(composeName.trim())}`)
        .then((data) => setComposeContacts(data.contacts))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [composeName, composeOpen, composeContactPicked])

  // Deep-link from a push notification tap: the service worker navigates to
  // /sms?thread=<id>, so once threads are loaded, open that thread directly
  // instead of landing on the plain list.
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const threadId = Number(params.get('thread'))
    if (threadId && threads.some((t) => t.id === threadId)) {
      openThread(threadId)
      const url = new URL(window.location.href)
      url.searchParams.delete('thread')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // iOS suspends a web app's JavaScript the instant it's not on screen, so
  // there's no such thing as this app staying current "in the background" --
  // this polling only ever runs while the page is actually visible, plus one
  // immediate refresh the moment you switch back to it. Real background
  // updates (app closed or behind another app) need push notifications,
  // which is a separate, not-yet-built piece.
  useEffect(() => {
    async function tick() {
      if (document.visibilityState !== 'visible') return
      await loadThreads().catch(() => {})
      if (activeId) {
        await refreshActiveMessages(activeId).catch(() => {})
        await loadScheduled(activeId).catch(() => {})
      }
    }
    const interval = setInterval(tick, 25000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [activeId])

  const [refreshing, setRefreshing] = useState(false)
  async function manualRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await loadThreads()
      if (activeId) await refreshActiveMessages(activeId)
    } catch {
      // transient network hiccup -- the reload below tries again anyway
    } finally {
      window.location.reload()
    }
  }

  // Home-screen icon badge (iOS 16.4+ Badging API, standalone/installed PWA
  // only). Syncs to the real unread count whenever it changes -- covers
  // initial load, opening a thread, sending, and a mock-injected text.
  // This only updates while the app can run JS -- it will NOT appear the
  // instant a text arrives with the app closed, since that needs a service
  // worker responding to a push notification, which isn't built yet. The
  // badge just reflects reality again the next time the app is opened.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    if (!nav.setAppBadge || !nav.clearAppBadge) return

    const unreadCount = threads.filter((t) => t.unread).length
    const sync = unreadCount > 0 ? nav.setAppBadge(unreadCount) : nav.clearAppBadge()
    sync.catch(() => {
      // Badging API not permitted in this context (e.g. not installed to
      // the home screen yet) -- fine, just no badge until it is.
    })
  }, [threads])

  async function openThread(id: number) {
    setActiveId(id)
    setView('thread')
    setCompose(loadDraft(id))
    setShowTemplates(false)
    setShowSchedule(false)
    setScheduleAt('')
    setShowSnooze(false)
    setSnoozeAt('')
    setAttachedImage(null)
    setEditingScheduledId(null)
    setContext(null)
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
    const data = await api<{ thread: Thread; messages: Message[] }>(`/api/sms/threads/${id}/messages`)
    setMessages(data.messages)
    await Promise.all([
      loadScheduled(id).catch(() => {}),
      loadContext(id).catch(() => {}),
    ])
  }

  function updateCompose(text: string) {
    setCompose(text)
    if (activeId) saveDraft(activeId, text)
  }

  async function attachImage(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    setAttachedImage({ dataUrl, mimeType: file.type })
  }

  async function send() {
    const text = compose.trim()
    if ((!text && !attachedImage) || !activeId || sending) return
    setSending(true)
    try {
      const data = await api<{ message: Message }>(`/api/sms/threads/${activeId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          text,
          ...(attachedImage
            ? { media_base64: attachedImage.dataUrl.split(',')[1], media_type: attachedImage.mimeType }
            : {}),
        }),
      })
      setMessages((prev) => [...prev, data.message])
      updateCompose('')
      setAttachedImage(null)
      await loadThreads()
    } finally {
      setSending(false)
    }
  }

  async function scheduleSend() {
    const text = compose.trim()
    if (!text || !activeId || !scheduleAt || scheduling) return
    const localDate = new Date(scheduleAt)
    if (Number.isNaN(localDate.getTime()) || localDate <= new Date()) return
    // Convert the datetime-local (browser-local wall clock) value to the UTC
    // "YYYY-MM-DD HH:MM:SS" form jobs/sms/scheduled_sender.py's
    // `send_at <= datetime('now')` cron compares against directly.
    const sendAt = localDate.toISOString().slice(0, 19).replace('T', ' ')
    setScheduling(true)
    try {
      if (editingScheduledId) {
        const data = await api<{ scheduled: ScheduledMessage }>(`/api/sms/scheduled/${editingScheduledId}`, {
          method: 'PUT',
          body: JSON.stringify({ text, send_at: sendAt }),
        })
        setScheduled((prev) =>
          prev.map((s) => (s.id === editingScheduledId ? data.scheduled : s)).sort((a, b) => a.send_at.localeCompare(b.send_at)),
        )
        setEditingScheduledId(null)
      } else {
        const data = await api<{ scheduled: ScheduledMessage }>(`/api/sms/threads/${activeId}/scheduled`, {
          method: 'POST',
          body: JSON.stringify({ text, send_at: sendAt }),
        })
        setScheduled((prev) => [...prev, data.scheduled].sort((a, b) => a.send_at.localeCompare(b.send_at)))
      }
      updateCompose('')
      setShowSchedule(false)
      setScheduleAt('')
    } finally {
      setScheduling(false)
    }
  }

  function editScheduled(s: ScheduledMessage) {
    setEditingScheduledId(s.id)
    setCompose(s.body)
    // send_at is UTC "YYYY-MM-DD HH:MM:SS" -- back to a local datetime-local value.
    const local = new Date(s.send_at.replace(' ', 'T') + 'Z')
    const offsetMs = local.getTimezoneOffset() * 60000
    setScheduleAt(new Date(local.getTime() - offsetMs).toISOString().slice(0, 16))
    setShowSchedule(true)
  }

  async function cancelScheduled(id: number) {
    setScheduled((prev) => prev.filter((s) => s.id !== id))
    if (editingScheduledId === id) {
      setEditingScheduledId(null)
      setShowSchedule(false)
      setScheduleAt('')
    }
    await api(`/api/sms/scheduled/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  function applyTemplate(t: Template) {
    setCompose(t.body.replaceAll('{first_name}', firstName(activeThread)))
    setShowTemplates(false)
  }

  async function saveTemplate(id: string, body: string) {
    const data = await api<Template>(`/api/sms/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    })
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
  }

  async function createTemplate(label: string, body: string) {
    const data = await api<Template>('/api/sms/templates', {
      method: 'POST',
      body: JSON.stringify({ label, body }),
    })
    setTemplates((prev) => [...prev, data])
  }

  async function runInject() {
    if (!injectPhone.trim() || !injectText.trim()) return
    await api('/api/sms/mock/inject', {
      method: 'POST',
      body: JSON.stringify({ phone: injectPhone.trim(), name: injectName.trim() || undefined, text: injectText.trim() }),
    })
    setInjectPhone('')
    setInjectName('')
    setInjectText('')
    setInjectOpen(false)
    await loadThreads()
  }

  function closeCompose() {
    setComposeOpen(false)
    setComposePhone('')
    setComposeName('')
    setComposeText('')
    setComposeContacts([])
    setComposeContactPicked(false)
    setComposeShowSchedule(false)
    setComposeScheduleAt('')
  }

  function pickContact(c: Contact) {
    setComposeName(c.name)
    setComposePhone(c.phone)
    setComposeContactPicked(true)
    setComposeContacts([])
  }

  async function sendNewMessage() {
    if (!composePhone.trim() || !composeText.trim() || composeSending) return
    if (composeShowSchedule && !composeScheduleAt) return
    setComposeSending(true)
    try {
      let threadId: number
      if (composeShowSchedule) {
        const localDate = new Date(composeScheduleAt)
        if (Number.isNaN(localDate.getTime()) || localDate <= new Date()) return
        const sendAt = localDate.toISOString().slice(0, 19).replace('T', ' ')
        const data = await api<{ thread: Thread }>('/api/sms/schedule', {
          method: 'POST',
          body: JSON.stringify({
            phone: composePhone.trim(),
            name: composeName.trim() || undefined,
            text: composeText.trim(),
            send_at: sendAt,
          }),
        })
        threadId = data.thread.id
      } else {
        const data = await api<{ thread: Thread }>('/api/sms/send', {
          method: 'POST',
          body: JSON.stringify({
            phone: composePhone.trim(),
            name: composeName.trim() || undefined,
            text: composeText.trim(),
          }),
        })
        threadId = data.thread.id
      }
      closeCompose()
      await loadThreads()
      await openThread(threadId)
    } finally {
      setComposeSending(false)
    }
  }

  const visibleThreads = threads.filter((t) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return displayName(t).toLowerCase().includes(q) || (t.last_message_preview ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg, color: COLORS.ink }}>
      {/* ---- LIST VIEW ---- */}
      {view === 'list' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center justify-between px-5 pt-6 pb-3">
            <div className="flex items-center gap-2">
              {isDev && (
                <button
                  onClick={() => setInjectOpen(true)}
                  className="text-xs px-2 py-1 rounded-md border"
                  style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                >
                  + test text
                </button>
              )}
              <button
                onClick={manualRefresh}
                disabled={refreshing}
                aria-label="Refresh messages"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center disabled:opacity-50"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={refreshing ? 'animate-spin' : ''}
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                {theme === 'dark' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                  </svg>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowPushInfo((s) => !s)}
                  aria-label="Notifications"
                  className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                  style={{
                    borderColor: pushStatus === 'granted' ? COLORS.moss : COLORS.line,
                    color: pushStatus === 'granted' ? COLORS.moss : COLORS.inkSoft,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={pushStatus === 'granted' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                {showPushInfo && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-11 z-10 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border p-3 flex flex-col gap-2 text-xs"
                    style={{ background: COLORS.surface, borderColor: COLORS.line, color: COLORS.ink }}
                  >
                    {pushStatus === 'granted' && (
                      <>
                        <p>Notifications are on. You&rsquo;ll only get them while this is fully closed once real texts are flowing through a real phone.</p>
                        <button
                          onClick={disablePush}
                          className="text-xs px-2.5 py-1.5 rounded-lg border self-start"
                          style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                        >
                          Turn off
                        </button>
                      </>
                    )}
                    {pushStatus === 'default' && (
                      <>
                        <p>Get notified here when a new text comes in, even if the app isn&rsquo;t open.</p>
                        <button
                          onClick={enablePush}
                          className="text-xs px-2.5 py-1.5 rounded-lg text-white self-start"
                          style={{ background: COLORS.moss }}
                        >
                          Turn on notifications
                        </button>
                      </>
                    )}
                    {pushStatus === 'busy' && <p style={{ color: COLORS.inkSoft }}>{pushStage || 'Working on it…'}</p>}
                    {pushStatus === 'error' && (
                      <>
                        <p style={{ color: COLORS.clay }}>Couldn&rsquo;t turn it on: {pushErrorDetail || 'something went wrong'}.</p>
                        <button
                          onClick={enablePush}
                          className="text-xs px-2.5 py-1.5 rounded-lg text-white self-start"
                          style={{ background: COLORS.moss }}
                        >
                          Try again
                        </button>
                      </>
                    )}
                    {pushStatus === 'denied' && (
                      <p>Notifications were turned off for this app in iOS Settings &rarr; Notifications &rarr; Watson SMS. They have to be re-enabled there, not here.</p>
                    )}
                    {pushStatus === 'not-standalone' && (
                      <p>Add this app to your home screen first (Share &rarr; Add to Home Screen), then open it from there to turn on notifications.</p>
                    )}
                    {pushStatus === 'unsupported' && <p>Notifications aren&rsquo;t supported in this browser.</p>}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setView('templates')
                }}
                aria-label="Add and edit templates"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const next = !showArchived
                  setShowArchived(next)
                  if (next) loadArchived().catch(() => {})
                }}
                aria-label="Show archived conversations"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{
                  borderColor: showArchived ? COLORS.tagblue : COLORS.line,
                  color: showArchived ? COLORS.tagblue : COLORS.inkSoft,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="5" rx="1" />
                  <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
                  <path d="M10 13h4" />
                </svg>
              </button>
              <button
                onClick={() => setComposeOpen(true)}
                aria-label="New message"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Log out"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </div>

          <div className="px-5 pb-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: COLORS.surfaceAlt }}
            >
              <span style={{ color: COLORS.inkSoft }}>🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="bg-transparent outline-none flex-1 text-sm"
                style={{ color: COLORS.ink }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <div className="px-5 py-6 text-sm" style={{ color: COLORS.inkSoft }}>Loading…</div>}

            {!loading && query.trim() && searchHits.length > 0 && (
              <div className="pb-2">
                <div className="px-5 pb-1 text-xs font-medium" style={{ color: COLORS.inkSoft }}>
                  Messages
                </div>
                {searchHits.map((h) => (
                  <button
                    key={h.message_id}
                    onClick={() => openThread(h.thread_id)}
                    className="w-full text-left px-5 py-2 border-b flex flex-col gap-0.5"
                    style={{ borderColor: COLORS.line }}
                  >
                    <span className="text-sm font-medium">{h.contact_name || h.phone}</span>
                    <span className="text-xs truncate" style={{ color: COLORS.inkSoft }}>
                      {h.body}
                    </span>
                  </button>
                ))}
                <div className="px-5 pt-2 pb-1 text-xs font-medium" style={{ color: COLORS.inkSoft }}>
                  Conversations
                </div>
              </div>
            )}

            {!loading && (showArchived ? archivedThreads : visibleThreads).length === 0 && (
              <div className="px-5 py-10 text-sm text-center" style={{ color: COLORS.inkSoft }}>
                {showArchived ? 'No archived conversations.' : 'No conversations yet.'}
                {!showArchived && isDev ? ' Use "+ test text" to simulate one.' : ''}
              </div>
            )}
            {(showArchived ? archivedThreads : visibleThreads).map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className="w-full text-left px-5 py-3 border-b flex items-start gap-3"
                style={{ borderColor: COLORS.line }}
              >
                <div
                  className="w-11 h-11 rounded-full flex-none flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: COLORS.moss }}
                >
                  {displayName(t).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm ${t.unread ? 'font-semibold' : 'font-medium'}`}>
                      {t.muted ? '🔕 ' : ''}
                      {t.snoozed_until ? '🕐 ' : ''}
                      {displayName(t)}
                    </span>
                    <span className={mono('text-xs flex-none')} style={{ color: COLORS.inkSoft }}>
                      {fmtTime(t.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate" style={{ color: COLORS.inkSoft }}>
                      {t.last_message_preview}
                    </span>
                    {!!t.unread && (
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: COLORS.moss }} />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- THREAD VIEW ---- */}
      {view === 'thread' && activeThread && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setView('list')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Messages
            </button>
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold">{displayName(activeThread)}</div>
              <div className={mono('text-xs')} style={{ color: COLORS.inkSoft }}>
                {activeThread.phone}
              </div>
            </div>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              aria-label="Refresh messages"
              className="w-[45px] h-[45px] rounded-lg flex items-center justify-center disabled:opacity-50 flex-none"
              style={{ color: COLORS.inkSoft }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: COLORS.line }}>
            <button
              onClick={() => patchThread(activeThread.id, { muted: !activeThread.muted })}
              className="text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{ borderColor: COLORS.line, color: activeThread.muted ? COLORS.clay : COLORS.inkSoft }}
            >
              {activeThread.muted ? '🔕 Muted' : '🔔 Mute'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSnooze((s) => !s)}
                className="text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: COLORS.line,
                  color: activeThread.snoozed_until ? COLORS.tagblue : COLORS.inkSoft,
                }}
              >
                {activeThread.snoozed_until ? `🕐 Snoozed till ${fmtScheduled(activeThread.snoozed_until)}` : '🕐 Snooze'}
              </button>
              {showSnooze && (
                <div
                  className="absolute left-0 top-9 z-10 w-60 max-w-[calc(100vw-2.5rem)] rounded-xl border p-2 flex flex-col gap-1 text-xs"
                  style={{ background: COLORS.surface, borderColor: COLORS.line, color: COLORS.ink }}
                >
                  {activeThread.snoozed_until && (
                    <button
                      className="text-left px-2 py-1.5 rounded-md"
                      style={{ background: COLORS.tagblueSoft, color: '#1D2E47' }}
                      onClick={() => {
                        patchThread(activeThread.id, { snoozed_until: null })
                        setShowSnooze(false)
                      }}
                    >
                      Clear snooze
                    </button>
                  )}
                  {[
                    { label: '3 hours', ms: 3 * 60 * 60 * 1000 },
                    { label: 'Tomorrow 9am', tomorrow9am: true },
                    { label: 'Next week', ms: 7 * 24 * 60 * 60 * 1000 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      className="text-left px-2 py-1.5 rounded-md"
                      style={{ background: COLORS.tagblueSoft, color: '#1D2E47' }}
                      onClick={() => {
                        let target: Date
                        if (opt.tomorrow9am) {
                          target = new Date()
                          target.setDate(target.getDate() + 1)
                          target.setHours(9, 0, 0, 0)
                        } else {
                          target = new Date(Date.now() + (opt.ms as number))
                        }
                        patchThread(activeThread.id, { snoozed_until: target.toISOString().slice(0, 19).replace('T', ' ') })
                        setShowSnooze(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <input
                    type="datetime-local"
                    value={snoozeAt}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(e) => setSnoozeAt(e.target.value)}
                    className="rounded-md border px-2 py-1.5"
                    style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
                  />
                  <button
                    disabled={!snoozeAt}
                    className="text-left px-2 py-1.5 rounded-md text-white disabled:opacity-40"
                    style={{ background: COLORS.moss }}
                    onClick={() => {
                      const d = new Date(snoozeAt)
                      if (Number.isNaN(d.getTime())) return
                      patchThread(activeThread.id, { snoozed_until: d.toISOString().slice(0, 19).replace('T', ' ') })
                      setShowSnooze(false)
                      setSnoozeAt('')
                    }}
                  >
                    Snooze until picked time
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => patchThread(activeThread.id, { state: activeThread.state === 'archived' ? 'open' : 'archived' })}
              className="text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
            >
              {activeThread.state === 'archived' ? '📤 Unarchive' : '🗄 Archive'}
            </button>
          </div>

          {context?.matched && (
            <div
              className="mx-4 mt-2 rounded-lg border px-3 py-2 text-xs flex flex-col gap-1 relative"
              style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
            >
              <button
                onClick={() => setShowSettings((s) => !s)}
                aria-label="Choose what shows here"
                className="absolute right-2 top-2"
              >
                ⚙
              </button>
              {contextFields.last_attended && context.last_attended_summary && <div>{context.last_attended_summary}</div>}
              {contextFields.deacon && context.deacon && <div>Deacon: {context.deacon}</div>}
              {contextFields.campus && context.campus_preference && <div>Campus: {context.campus_preference}</div>}
              {contextFields.first_visit && context.first_visit_date && <div>First visit: {context.first_visit_date}</div>}
              {contextFields.household && context.household && context.household.length > 0 && (
                <div>
                  Household: {context.household.map((h) => (h.household_role ? `${h.name} (${h.household_role})` : h.name)).join(', ')}
                </div>
              )}
              {showSettings && (
                <div
                  className="absolute right-2 top-8 z-10 w-52 rounded-xl border p-2 flex flex-col gap-1 text-xs"
                  style={{ background: COLORS.surface, borderColor: COLORS.line, color: COLORS.ink }}
                >
                  <span className="px-1 pb-1 font-medium">Show in this panel:</span>
                  {CONTEXT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 px-1 py-1">
                      <input
                        type="checkbox"
                        checked={contextFields[f.key]}
                        onChange={(e) => saveContextFields({ ...contextFields, [f.key]: e.target.checked })}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5" style={{ alignItems: m.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                <div
                  className="max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-snug flex flex-col gap-1.5"
                  style={
                    m.direction === 'out'
                      ? { background: COLORS.moss, color: 'white' }
                      : { background: COLORS.surfaceAlt, color: COLORS.ink }
                  }
                >
                  {m.media_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.media_url} alt="Attachment" className="rounded-lg max-w-full" />
                  )}
                  {m.body && <span>{m.body}</span>}
                </div>
                {m.direction === 'out' && m.status === 'failed' && (
                  <span className="text-xs px-1" style={{ color: COLORS.clay }}>
                    Failed to send
                  </span>
                )}
              </div>
            ))}
          </div>

          {scheduled.length > 0 && (
            <div className="px-4 pb-2 flex flex-col gap-1.5">
              {scheduled.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-xs"
                  style={{
                    borderColor: s.status === 'failed' ? COLORS.clay : COLORS.tagblue,
                    color: s.status === 'failed' ? COLORS.clay : COLORS.tagblue,
                  }}
                >
                  <span aria-hidden>{s.status === 'failed' ? '⚠' : '🕐'}</span>
                  <span className="flex-1 truncate" style={{ color: COLORS.ink }}>
                    {s.body}
                  </span>
                  <span className="flex-none">
                    {s.status === 'failed' ? `failed: ${s.error || 'send failed'}` : fmtScheduled(s.send_at)}
                  </span>
                  <button onClick={() => editScheduled(s)} aria-label="Edit scheduled message" className="flex-none px-1">
                    ✎
                  </button>
                  <button onClick={() => cancelScheduled(s.id)} aria-label="Cancel scheduled message" className="flex-none px-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t px-4 pt-3 pb-4 flex flex-col gap-2" style={{ borderColor: COLORS.line }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTemplates((s) => !s)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  Use a template
                </button>
                <button
                  onClick={() => {
                    if (editingScheduledId) {
                      setEditingScheduledId(null)
                      setScheduleAt('')
                      updateCompose('')
                    }
                    setShowSchedule((s) => !s)
                  }}
                  aria-label="Schedule for later"
                  className="text-xs font-medium px-2.5 py-1 rounded-full border"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  🕐 Later
                </button>
                <label
                  aria-label="Attach a photo"
                  className="text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) attachImage(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                Nothing sends until you tap send
              </span>
            </div>
            {showTemplates && (
              <div className="flex flex-col gap-1 rounded-lg border p-2" style={{ borderColor: COLORS.line }}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left text-xs px-2 py-1.5 rounded-md"
                    style={{ background: COLORS.tagblueSoft, color: '#1D2E47' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {showSchedule && (
              <div className="flex flex-col gap-2 rounded-lg border p-2" style={{ borderColor: COLORS.line }}>
                <label className="text-xs" style={{ color: COLORS.inkSoft }}>
                  {editingScheduledId ? 'Edit send time:' : 'Send this message at:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1.5 text-sm"
                    style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
                  />
                  <button
                    onClick={scheduleSend}
                    disabled={!compose.trim() || !scheduleAt || scheduling}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-40 flex-none"
                    style={{ background: COLORS.moss }}
                  >
                    {editingScheduledId ? 'Save' : 'Schedule'}
                  </button>
                </div>
              </div>
            )}
            {attachedImage && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage.dataUrl} alt="Attached" className="w-14 h-14 rounded-lg object-cover" />
                <button onClick={() => setAttachedImage(null)} className="text-xs" style={{ color: COLORS.inkSoft }}>
                  Remove photo
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={compose}
                onChange={(e) => updateCompose(e.target.value)}
                placeholder="Write your reply"
                rows={1}
                className="flex-1 rounded-2xl border px-3.5 py-2 text-sm outline-none resize-none"
                style={{ borderColor: compose ? COLORS.moss : COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
              />
              <button
                onClick={send}
                disabled={(!compose.trim() && !attachedImage) || sending}
                className="w-[45px] h-[45px] rounded-full flex-none text-white text-lg disabled:opacity-40"
                style={{ background: COLORS.moss }}
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- TEMPLATES VIEW ---- */}
      {view === 'templates' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button
              onClick={() => {
                setView('list')
                setAddingTemplate(false)
              }}
              style={{ color: COLORS.moss }}
              className="font-medium text-sm"
            >
              ← Messages
            </button>
            <h2 className={fraunces('flex-1 text-center text-sm font-semibold')}>Saved templates</h2>
            <button
              onClick={() => setAddingTemplate((s) => !s)}
              aria-label="Add a new template"
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: COLORS.moss, color: COLORS.moss }}
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-xs" style={{ color: COLORS.inkSoft }}>
              These are your words. Watson only merges a name into them when you choose to use one — it never writes new phrasing.
            </p>
            {addingTemplate && (
              <NewTemplateCard
                colors={COLORS}
                onCreate={async (label, body) => {
                  await createTemplate(label, body)
                  setAddingTemplate(false)
                }}
                onCancel={() => setAddingTemplate(false)}
              />
            )}
            {templates.map((t) => (
              <TemplateCard key={t.id} colors={COLORS} template={t} onSave={(body) => saveTemplate(t.id, body)} />
            ))}
          </div>
        </div>
      )}

      {/* ---- NEW MESSAGE MODAL ---- */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-20">
          <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: COLORS.surface, color: COLORS.ink }}>
            <h3 className="text-sm font-semibold">New message</h3>
            <div className="relative">
              <input
                value={composeName}
                onChange={(e) => {
                  setComposeName(e.target.value)
                  setComposeContactPicked(false)
                }}
                placeholder="Name -- search contacts or type your own"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              />
              {composeContacts.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border max-h-40 overflow-y-auto flex flex-col"
                  style={{ background: COLORS.surface, borderColor: COLORS.line }}
                >
                  {composeContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickContact(c)}
                      className="text-left px-3 py-2 text-sm flex flex-col"
                      style={{ borderBottom: `1px solid ${COLORS.line}` }}
                    >
                      <span>{c.name}</span>
                      <span className={mono('text-xs')} style={{ color: COLORS.inkSoft }}>
                        {c.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={composePhone}
              onChange={(e) => setComposePhone(e.target.value)}
              placeholder="Phone number"
              inputMode="tel"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="Message text"
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <button
              onClick={() => setComposeShowSchedule((s) => !s)}
              className="text-xs font-medium px-2.5 py-1 rounded-full border self-start"
              style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
            >
              🕐 {composeShowSchedule ? 'Sending later' : 'Send now'}
            </button>
            {composeShowSchedule && (
              <input
                type="datetime-local"
                value={composeScheduleAt}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setComposeScheduleAt(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={closeCompose} className="text-sm px-3 py-1.5" style={{ color: COLORS.inkSoft }}>
                Cancel
              </button>
              <button
                onClick={sendNewMessage}
                disabled={!composePhone.trim() || !composeText.trim() || (composeShowSchedule && !composeScheduleAt) || composeSending}
                className="text-sm px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
                style={{ background: COLORS.moss }}
              >
                {composeShowSchedule ? 'Schedule' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- DEV MOCK INJECT MODAL ---- */}
      {injectOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-20">
          <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: COLORS.surface, color: COLORS.ink }}>
            <h3 className="text-sm font-semibold">Simulate an inbound text (dev only)</h3>
            <input
              value={injectPhone}
              onChange={(e) => setInjectPhone(e.target.value)}
              placeholder="Phone number"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <input
              value={injectName}
              onChange={(e) => setInjectName(e.target.value)}
              placeholder="Name (optional)"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <textarea
              value={injectText}
              onChange={(e) => setInjectText(e.target.value)}
              placeholder="Message text"
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setInjectOpen(false)} className="text-sm px-3 py-1.5" style={{ color: COLORS.inkSoft }}>
                Cancel
              </button>
              <button
                onClick={runInject}
                className="text-sm px-3 py-1.5 rounded-lg text-white"
                style={{ background: COLORS.moss }}
              >
                Send test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewTemplateCard({
  colors,
  onCreate,
  onCancel,
}: {
  colors: Palette
  onCreate: (label: string, body: string) => Promise<void>
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const canCreate = label.trim().length > 0 && body.trim().length > 0

  return (
    <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: colors.moss }}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name this template (e.g. Follow-up after a hospital visit)"
        className="text-sm border rounded-lg px-3 py-2 outline-none font-semibold"
        style={{ borderColor: colors.line, background: colors.surface, color: colors.ink }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write the message — use {first_name} anywhere you want their name merged in"
        rows={4}
        className="text-sm border rounded-lg px-3 py-2 outline-none"
        style={{ borderColor: colors.line, background: colors.surface, color: colors.ink }}
      />
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1.5" style={{ color: colors.inkSoft }}>
          Cancel
        </button>
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onCreate(label.trim(), body.trim())
            } finally {
              setSaving(false)
            }
          }}
          disabled={!canCreate || saving}
          className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: colors.moss }}
        >
          Create
        </button>
      </div>
    </div>
  )
}

function TemplateCard({
  colors,
  template,
  onSave,
}: {
  colors: Palette
  template: Template
  onSave: (body: string) => Promise<void>
}) {
  const [body, setBody] = useState(template.body)
  const [saving, setSaving] = useState(false)
  const dirty = body !== template.body

  return (
    <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: colors.line }}>
      <div className="text-xs font-semibold">{template.label}</div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="text-sm border rounded-lg px-3 py-2 outline-none"
        style={{ borderColor: colors.line, background: colors.surface, color: colors.ink }}
      />
      <div className="flex items-center justify-between">
        <span className={mono('text-xs')} style={{ color: colors.inkSoft }}>
          Updated {template.updated_at}
        </span>
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave(body)
            } finally {
              setSaving(false)
            }
          }}
          disabled={!dirty || saving}
          className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: colors.moss }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
