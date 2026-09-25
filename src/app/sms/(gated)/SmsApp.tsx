'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSmsTheme } from '@/lib/useSmsTheme'

type Thread = {
  id: number
  phone: string
  contact_name: string | null
  last_message_preview: string | null
  last_message_at: string | null
  unread: number
}
type Message = { id: number; direction: 'in' | 'out'; body: string; created_at: string }
type Template = { id: string; label: string; body: string; updated_at: string }

type View = 'list' | 'thread' | 'templates'

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
  const COLORS: Palette = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS
  const [view, setView] = useState<View>('list')
  const [threads, setThreads] = useState<Thread[]>([])
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [compose, setCompose] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [injectOpen, setInjectOpen] = useState(false)
  const [injectPhone, setInjectPhone] = useState('')
  const [injectName, setInjectName] = useState('')
  const [injectText, setInjectText] = useState('')
  const [addingTemplate, setAddingTemplate] = useState(false)

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

  useEffect(() => {
    Promise.all([loadThreads(), loadTemplates()])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    setCompose('')
    setShowTemplates(false)
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
    const data = await api<{ thread: Thread; messages: Message[] }>(`/api/sms/threads/${id}/messages`)
    setMessages(data.messages)
  }

  async function send() {
    const text = compose.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    try {
      const data = await api<{ message: Message }>(`/api/sms/threads/${activeId}/send`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      setMessages((prev) => [...prev, data.message])
      setCompose('')
      await loadThreads()
    } finally {
      setSending(false)
    }
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
            <h1 className={fraunces('text-2xl font-semibold')}>Messages</h1>
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
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="w-9 h-9 rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setView('templates')
                }}
                aria-label="Add and edit templates"
                className="text-xs font-medium px-3 py-2 rounded-lg border flex items-center gap-1.5"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                ✎ Templates
              </button>
              <form action={logoutAction}>
                <button type="submit" className="text-xs underline" style={{ color: COLORS.inkSoft }}>
                  Log out
                </button>
              </form>
            </div>
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
            {!loading && visibleThreads.length === 0 && (
              <div className="px-5 py-10 text-sm text-center" style={{ color: COLORS.inkSoft }}>
                No conversations yet.
                {isDev ? ' Use "+ test text" to simulate one.' : ''}
              </div>
            )}
            {visibleThreads.map((t) => (
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
                    <span className={`text-sm ${t.unread ? 'font-semibold' : 'font-medium'}`}>{displayName(t)}</span>
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
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className="max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-snug"
                style={
                  m.direction === 'out'
                    ? { alignSelf: 'flex-end', background: COLORS.moss, color: 'white' }
                    : { alignSelf: 'flex-start', background: COLORS.surfaceAlt, color: COLORS.ink }
                }
              >
                {m.body}
              </div>
            ))}
          </div>

          <div className="border-t px-4 pt-3 pb-4 flex flex-col gap-2" style={{ borderColor: COLORS.line }}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTemplates((s) => !s)}
                className="text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
              >
                Use a template
              </button>
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
            <div className="flex items-end gap-2">
              <textarea
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                placeholder="Write your reply"
                rows={1}
                className="flex-1 rounded-2xl border px-3.5 py-2 text-sm outline-none resize-none"
                style={{ borderColor: compose ? COLORS.moss : COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
              />
              <button
                onClick={send}
                disabled={!compose.trim() || sending}
                className="w-9 h-9 rounded-full flex-none text-white disabled:opacity-40"
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
