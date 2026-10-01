'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  draft_text: string | null
  highlight_note: string | null
  is_group: boolean
  participants: { phone: string; contact_name: string | null }[]
  group_name: string | null
}
type Message = {
  id: number
  direction: 'in' | 'out'
  body: string
  created_at: string
  media_url: string | null
  media_type: string | null
  status: 'sent' | 'delivered' | 'failed' | null
  sender_phone: string | null
  sender_name: string | null
}
type ScheduledMessage = { id: number; body: string; send_at: string; status: 'pending' | 'failed'; error: string | null }
type Template = { id: string; label: string; body: string; updated_at: string }
type SearchHit = { message_id: number; thread_id: number; body: string; created_at: string; contact_name: string | null; phone: string }
type Contact = { id: number; name: string; phone: string }
type Member = { id: number; name: string; phone: string | null }
type AttentionMember = {
  id: number
  name: string
  phone: string | null
  bucket: 'at_risk' | 'critical' | 'disconnected'
  weeks_absent: number
  thread_id: number | null
}
type Context = {
  matched: boolean
  name?: string
  campus_preference?: string | null
  first_visit_date?: string | null
  deacon?: string | null
  last_attended_summary?: string
  household?: { name: string; household_role: string | null }[]
  birthdate?: string | null
  anniversary?: string | null
  active_status?: string | null
  serving_teams?: { team_name: string; position: string | null }[]
  started_serving_date?: string | null
}

type View = 'list' | 'thread' | 'templates' | 'settings' | 'broadcast' | 'broadcastHistory'

type GroupFilter = { deacons?: string[]; teams?: string[]; roles?: string[]; campuses?: string[] }
type SmsGroup = { id: number; name: string; filter: GroupFilter; active_only: boolean; manual_only: boolean; recipient_count: number }
type GroupOptions = { deacons: string[]; teams: string[]; roles: string[]; campuses: string[] }
type BroadcastRecipient = { member_id: number | null; phone: string; contact_name: string | null }
type Broadcast = {
  id: number
  group_id: number | null
  group_name: string | null
  body: string
  send_at: string
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled'
  recipient_count: number
  sent_count: number
  failed_count: number
  spread_hours: number | null
  error: string | null
  created_at: string
}

const CONTEXT_FIELDS = [
  { key: 'last_attended', label: 'Last attended' },
  { key: 'household', label: 'Household' },
  { key: 'deacon', label: 'Deacon' },
  { key: 'campus', label: 'Campus preference' },
  { key: 'first_visit', label: 'First visit date' },
  { key: 'birthdate_anniversary', label: 'Birthdate / Anniversary' },
  { key: 'serving', label: 'Serving status' },
  { key: 'active_status', label: 'Active/inactive status' },
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
  moss: '#3C5C89',
  mossStrong: '#2A4666',
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
  moss: '#7FA1D4',
  mossStrong: '#9DBBE3',
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

// Accent themes: only the primary accent (moss/mossStrong, used for the
// send button, active states, links) changes -- surfaces/ink/etc. stay
// the same clean neutral scale in every theme, light and dark mode both
// still apply independently on top. "Ocean" matches the app icon and is
// the default.
const ACCENT_THEMES = [
  { key: 'ocean', label: 'Ocean', swatch: '#3C5C89', light: { moss: '#3C5C89', mossStrong: '#2A4666' }, dark: { moss: '#7FA1D4', mossStrong: '#9DBBE3' } },
  { key: 'violet', label: 'Violet', swatch: '#6B46A3', light: { moss: '#6B46A3', mossStrong: '#4F3379' }, dark: { moss: '#B794E6', mossStrong: '#CBAEF0' } },
  { key: 'teal', label: 'Teal', swatch: '#0F766E', light: { moss: '#0F766E', mossStrong: '#0B5A54' }, dark: { moss: '#4FD1C5', mossStrong: '#7EE8DC' } },
  { key: 'forest', label: 'Forest', swatch: '#2F6B4F', light: { moss: '#2F6B4F', mossStrong: '#204A37' }, dark: { moss: '#6FBE94', mossStrong: '#8ED1AC' } },
  { key: 'rose', label: 'Rose', swatch: '#A3405C', light: { moss: '#A3405C', mossStrong: '#7C2F46' }, dark: { moss: '#E38CA6', mossStrong: '#EDA8BD' } },
  { key: 'slate', label: 'Slate', swatch: '#475569', light: { moss: '#475569', mossStrong: '#334155' }, dark: { moss: '#94A3B8', mossStrong: '#B0BECC' } },
] as const
type AccentKey = (typeof ACCENT_THEMES)[number]['key'] | 'custom'
const DEFAULT_CUSTOM_HEX = '#3C5C89'

// Splits a message body on bare URLs and renders each as a clickable link,
// underlined in the bubble's own text color (currentColor) so it reads
// correctly against both the outbound (moss/white) and inbound
// (surfaceAlt/ink) bubble backgrounds without a separate per-theme link
// color. Plain-text segments pass through unchanged.
const _URL_RE = /(https?:\/\/[^\s<>"')\]]+)/gi
function linkifyBody(body: string) {
  // split() with a capturing-group regex alternates [text, match, text,
  // match, ...] -- odd indices are always the matched URLs. Re-testing
  // each part against _URL_RE instead would be wrong: a global regex's
  // .test() is stateful (tracks lastIndex across calls), so repeated calls
  // here would silently skip or duplicate matches.
  const parts = body.split(_URL_RE)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      // eslint-disable-next-line react/no-array-index-key
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
        {part}
      </a>
    ) : (
      // eslint-disable-next-line react/no-array-index-key
      <span key={i}>{part}</span>
    )
  )
}

function loadAccentTheme(): AccentKey {
  try {
    const stored = localStorage.getItem('sms_accent_theme')
    if (stored === 'custom' || ACCENT_THEMES.some((t) => t.key === stored)) return stored as AccentKey
  } catch {
    // localStorage unavailable -- default accent
  }
  return 'ocean'
}

function loadCustomAccentHex(): string {
  try {
    const stored = localStorage.getItem('sms_accent_custom_hex')
    if (stored && /^#[0-9a-fA-F]{6}$/.test(stored)) return stored
  } catch {
    // localStorage unavailable -- default hex
  }
  return DEFAULT_CUSTOM_HEX
}

// Minimal hex<->HSL round trip -- no need for a full color library just to
// darken/lighten a single picked hue for the light/dark mossStrong pairs.
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
function withLightness(hex: string, lightness: number): string {
  const [h, s] = hexToHsl(hex)
  return hslToHex(h, Math.max(s, 0.35), lightness)
}

function applyAccent(base: Palette, mode: 'light' | 'dark', accent: AccentKey, customHex: string): Palette {
  if (accent === 'custom') {
    const [, , l] = hexToHsl(customHex)
    const override = mode === 'dark'
      ? { moss: withLightness(customHex, Math.max(l, 0.68)), mossStrong: withLightness(customHex, Math.max(l, 0.68) + 0.1) }
      : { moss: customHex, mossStrong: withLightness(customHex, Math.max(l - 0.14, 0.15)) }
    return { ...base, moss: override.moss, mossStrong: override.mossStrong }
  }
  const found = ACCENT_THEMES.find((t) => t.key === accent) ?? ACCENT_THEMES[0]
  const override = mode === 'dark' ? found.dark : found.light
  return { ...base, moss: override.moss, mossStrong: override.mossStrong }
}

function fraunces(extra = '') {
  return `font-[family-name:var(--font-fraunces)] ${extra}`
}
function mono(extra = '') {
  return `font-[family-name:var(--font-plex-mono)] ${extra}`
}

// Auto-grows a textarea to fit its content (up to maxPx) instead of clipping
// to a fixed row count -- resetting height to 'auto' first is required so
// scrollHeight reports the content's real height rather than the previous
// expanded height (it would otherwise only ever grow, never shrink back
// down after deleting text).
function useAutoGrowTextarea(value: string, maxPx = 160) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`
  }, [value, maxPx])
  return ref
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

// Rough client-side estimate only (mirrors jobs/sms/broadcast_pacing.py's
// default 8-45s per-recipient gap, ~26.5s average) -- the real spread is
// randomized server-side at confirm time, this is just so Bill isn't
// guessing whether "142 recipients" means 2 minutes or 2 hours before he
// schedules it. Not shown as exact since the true value depends on the
// live env-tunable gap, which this doesn't fetch.
function estimateSpreadLabel(recipientCount: number, spreadHours: number | null): string {
  if (recipientCount <= 1) return ''
  const totalSeconds = spreadHours ? spreadHours * 3600 : (recipientCount - 1) * 26.5
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `about ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes === 0 ? `about ${hours}h` : `about ${hours}h ${remMinutes}m`
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

type ContextEntry = { key: string; label: string; value: string; full?: boolean }

function buildContextEntries(context: Context, fields: Record<ContextFieldKey, boolean>): ContextEntry[] {
  const entries: ContextEntry[] = []
  if (fields.last_attended && context.last_attended_summary) {
    entries.push({ key: 'last_attended', label: 'Last attended', value: context.last_attended_summary, full: true })
  }
  if (fields.deacon && context.deacon) entries.push({ key: 'deacon', label: 'Deacon', value: context.deacon })
  if (fields.campus && context.campus_preference) entries.push({ key: 'campus', label: 'Campus', value: context.campus_preference })
  if (fields.first_visit && context.first_visit_date) entries.push({ key: 'first_visit', label: 'First visit', value: context.first_visit_date })
  if (fields.birthdate_anniversary && context.birthdate) entries.push({ key: 'birthday', label: 'Birthday', value: context.birthdate })
  if (fields.birthdate_anniversary && context.anniversary) entries.push({ key: 'anniversary', label: 'Anniversary', value: context.anniversary })
  if (fields.active_status && context.active_status) entries.push({ key: 'status', label: 'Status', value: context.active_status })
  if (fields.household && context.household && context.household.length > 0) {
    entries.push({
      key: 'household',
      label: 'Household',
      value: context.household.map((h) => (h.household_role ? `${h.name} (${h.household_role})` : h.name)).join(', '),
      full: true,
    })
  }
  if (fields.serving && (context.serving_teams?.length || context.started_serving_date)) {
    const teams = context.serving_teams?.length
      ? context.serving_teams.map((t) => (t.position ? `${t.team_name} (${t.position})` : t.team_name)).join(', ')
      : ''
    const since = context.started_serving_date ? `since ${context.started_serving_date}` : ''
    entries.push({ key: 'serving', label: 'Serving', value: [teams, since].filter(Boolean).join(' — '), full: true })
  }
  return entries
}

function displayName(t: Thread): string {
  if (t.is_group) {
    if (t.group_name) return t.group_name
    if (t.participants?.length) {
      const names = t.participants.map((p) => p.contact_name || p.phone)
      return names.length <= 2 ? names.join(' & ') : `${names[0]} & ${names.length - 1} others`
    }
  }
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

export default function SmsApp() {
  const [theme, toggleTheme] = useSmsTheme()
  const { status: pushStatus, errorDetail: pushErrorDetail, stage: pushStage, enable: enablePush } = useSmsPush()
  const [showPushInfo, setShowPushInfo] = useState(false)
  const [accentTheme, setAccentTheme] = useState<AccentKey>('ocean')
  const [customAccentHex, setCustomAccentHex] = useState(DEFAULT_CUSTOM_HEX)
  const COLORS: Palette = applyAccent(theme === 'dark' ? DARK_COLORS : LIGHT_COLORS, theme, accentTheme, customAccentHex)
  const [view, setView] = useState<View>('list')
  const [threads, setThreads] = useState<Thread[]>([])
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameDraft, setGroupNameDraft] = useState('')
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
  // Additional recipients beyond the primary phone/name fields above --
  // present, this becomes a "start a group text" send (see sendNewMessage).
  const [extraRecipients, setExtraRecipients] = useState<{ phone: string; name: string }[]>([])
  const [composeText, setComposeText] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeContacts, setComposeContacts] = useState<Contact[]>([])
  const [composeContactPicked, setComposeContactPicked] = useState(false)
  // Which extra-recipient row (if any) currently has an open contact-picker
  // dropdown, mirroring composeContacts/composeContactPicked above but for
  // the "Add another person" rows used to start a group text.
  const [activeExtraContactIndex, setActiveExtraContactIndex] = useState<number | null>(null)
  const [extraContacts, setExtraContacts] = useState<Contact[]>([])
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
  const [showAttention, setShowAttention] = useState(false)
  const [attentionMembers, setAttentionMembers] = useState<AttentionMember[]>([])
  const [attentionLoading, setAttentionLoading] = useState(false)
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [showLinkMember, setShowLinkMember] = useState(false)
  const [linkMemberQuery, setLinkMemberQuery] = useState('')
  const [linkMemberResults, setLinkMemberResults] = useState<Member[]>([])
  const [linking, setLinking] = useState(false)
  const [linkConflict, setLinkConflict] = useState<{ memberId: number; memberName: string; existingPhone: string; newPhone: string } | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [vacationMode, setVacationMode] = useState(false)
  const [sabbathSilence, setSabbathSilence] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [contextFields, setContextFields] = useState<Record<ContextFieldKey, boolean>>(() =>
    Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, true])) as Record<ContextFieldKey, boolean>,
  )
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null)
  const [editingScheduledId, setEditingScheduledId] = useState<number | null>(null)
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null)
  const [batteryPct, setBatteryPct] = useState<number | null>(null)
  const [spellchecking, setSpellchecking] = useState(false)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const listScrollRef = useRef<HTMLDivElement | null>(null)
  const pullStartY = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [pullReleased, setPullReleased] = useState(false)
  const PULL_THRESHOLD = 64
  const composeGrowRef = useAutoGrowTextarea(compose)
  const composeTextGrowRef = useAutoGrowTextarea(composeText)

  // ---- Broadcast (group text-out) state ----
  const [broadcastStep, setBroadcastStep] = useState<'compose' | 'review'>('compose')
  // 'filtered': deacon/team/role/campus + active-only decide who's in.
  // 'manual': ignore all of that -- the hand-picked list below IS the
  // whole audience (an empty filter means "no restriction", i.e.
  // everyone, so there is no way to express "just these people" by
  // combining an empty filter with manual adds -- see manual_only in
  // jobs/sms/api.py's _resolve_adhoc).
  const [audienceMode, setAudienceMode] = useState<'filtered' | 'manual'>('filtered')
  const [groupOptions, setGroupOptions] = useState<GroupOptions | null>(null)
  const [savedGroups, setSavedGroups] = useState<SmsGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [selDeacons, setSelDeacons] = useState<string[]>([])
  const [selTeams, setSelTeams] = useState<string[]>([])
  const [selRoles, setSelRoles] = useState<string[]>([])
  const [selCampuses, setSelCampuses] = useState<string[]>([])
  const [broadcastActiveOnly, setBroadcastActiveOnly] = useState(true)
  const [manualRecipients, setManualRecipients] = useState<{ member_id: number | null; phone: string; name: string }[]>([])
  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState<Contact[]>([])
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSendAt, setBroadcastSendAt] = useState('')
  // null = quick (default 8-45s/recipient gap); a number = spread the
  // whole list evenly across that many hours instead, respecting quiet
  // hours (jobs/sms/broadcast_pacing.py) -- the more this looks like Bill
  // texting people one at a time over a day, the less any single-number
  // fan-out pattern stands out to carrier spam filters.
  const [spreadHours, setSpreadHours] = useState<number | null>(null)
  const [broadcastPreview, setBroadcastPreview] = useState<{ recipient_count: number; recipients: BroadcastRecipient[] } | null>(null)
  const [broadcastPreviewLoading, setBroadcastPreviewLoading] = useState(false)
  const [removedPhones, setRemovedPhones] = useState<Set<string>>(new Set())
  const [saveAsGroup, setSaveAsGroup] = useState(false)
  const [saveGroupName, setSaveGroupName] = useState('')
  const [broadcastScheduling, setBroadcastScheduling] = useState(false)
  const [broadcastError, setBroadcastError] = useState<string | null>(null)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [broadcastsLoading, setBroadcastsLoading] = useState(false)
  const broadcastBodyGrowRef = useAutoGrowTextarea(broadcastBody)

  useEffect(() => {
    setContextFields(loadContextSettings())
    setAccentTheme(loadAccentTheme())
    setCustomAccentHex(loadCustomAccentHex())
    try {
      setContextCollapsed(localStorage.getItem('sms_context_collapsed') === 'true')
    } catch {
      // localStorage unavailable (private mode etc) -- stays expanded
    }
  }, [])

  function chooseAccentTheme(key: AccentKey) {
    setAccentTheme(key)
    try {
      localStorage.setItem('sms_accent_theme', key)
    } catch {
      // localStorage unavailable (private mode etc) -- setting just won't persist
    }
  }

  function chooseCustomAccentHex(hex: string) {
    setAccentTheme('custom')
    setCustomAccentHex(hex)
    try {
      localStorage.setItem('sms_accent_theme', 'custom')
      localStorage.setItem('sms_accent_custom_hex', hex)
    } catch {
      // localStorage unavailable (private mode etc) -- setting just won't persist
    }
  }

  function toggleContextCollapsed() {
    setContextCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sms_context_collapsed', String(next))
      } catch {
        // localStorage unavailable (private mode etc) -- setting just won't persist
      }
      return next
    })
  }

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

  async function patchThread(id: number, patch: Partial<Pick<Thread, 'state' | 'muted' | 'snoozed_until' | 'unread' | 'draft_text' | 'highlight_note' | 'group_name'>>) {
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

  async function loadHeartbeat() {
    const data = await api<{ heartbeat: { ok: boolean; battery_pct: number | null } | null }>('/api/sms/heartbeat')
    setGatewayOk(data.heartbeat?.ok ?? null)
    setBatteryPct(data.heartbeat?.battery_pct ?? null)
  }

  async function loadAppSettings() {
    const data = await api<{ vacation_mode: boolean; sabbath_silence: boolean }>('/api/sms/settings')
    setVacationMode(data.vacation_mode)
    setSabbathSilence(data.sabbath_silence)
  }

  async function updateAppSetting(patch: { vacation_mode?: boolean; sabbath_silence?: boolean }) {
    setSavingSettings(true)
    try {
      const data = await api<{ vacation_mode: boolean; sabbath_silence: boolean }>('/api/sms/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setVacationMode(data.vacation_mode)
      setSabbathSilence(data.sabbath_silence)
    } catch {
      // transient network hiccup -- toggle just won't visually update; user can retry
    } finally {
      setSavingSettings(false)
    }
  }

  async function loadContext(id: number) {
    const data = await api<Context>(`/api/sms/threads/${id}/context`)
    setContext(data)
  }

  // ---- Broadcast (group text-out) ----
  //
  // Bill authors the exact wording and defines the group; Watson only
  // resolves who's in it and fans the send out on schedule -- see
  // feedback_ai_never_originates_relational_language. Delivery is always
  // individual 1:1 texts (jobs/sms/broadcast_sender.py), never a group-MMS
  // thread, so no recipient sees anyone else's number.

  function resetBroadcastComposer() {
    setBroadcastStep('compose')
    setAudienceMode('filtered')
    setSelectedGroupId(null)
    setSelDeacons([])
    setSelTeams([])
    setSelRoles([])
    setSelCampuses([])
    setBroadcastActiveOnly(true)
    setManualRecipients([])
    setManualQuery('')
    setManualResults([])
    setBroadcastBody('')
    setBroadcastSendAt('')
    setSpreadHours(null)
    setBroadcastPreview(null)
    setRemovedPhones(new Set())
    setSaveAsGroup(false)
    setSaveGroupName('')
    setBroadcastError(null)
  }

  async function openBroadcast() {
    resetBroadcastComposer()
    setView('broadcast')
    try {
      const [opts, groups] = await Promise.all([
        api<GroupOptions>('/api/sms/groups/options'),
        api<{ groups: SmsGroup[] }>('/api/sms/groups'),
      ])
      setGroupOptions(opts)
      setSavedGroups(groups.groups)
    } catch {
      // transient -- the group builder just shows empty picker lists; Bill can retry by reopening
    }
  }

  async function pickSavedGroup(id: number | null) {
    setSelectedGroupId(id)
    setManualRecipients([])
    setRemovedPhones(new Set())
    if (id === null) {
      setAudienceMode('filtered')
      setSelDeacons([])
      setSelTeams([])
      setSelRoles([])
      setSelCampuses([])
      setBroadcastActiveOnly(true)
      return
    }
    const g = savedGroups.find((sg) => sg.id === id)
    if (!g) return
    setAudienceMode(g.manual_only ? 'manual' : 'filtered')
    setSelDeacons(g.filter.deacons ?? [])
    setSelTeams(g.filter.teams ?? [])
    setSelRoles(g.filter.roles ?? [])
    setSelCampuses(g.filter.campuses ?? [])
    setBroadcastActiveOnly(g.active_only)
    try {
      const data = await api<{ overrides: { member_id: number | null; phone: string; contact_name: string | null; mode: string }[] }>(
        `/api/sms/groups/${id}/members`,
      )
      setManualRecipients(
        data.overrides.filter((o) => o.mode === 'include').map((o) => ({ member_id: o.member_id, phone: o.phone, name: o.contact_name || '' })),
      )
    } catch {
      // transient -- hand-picked additions on this saved group just won't preload
    }
  }

  function toggleDim(list: string[], setList: (v: string[]) => void, value: string) {
    setSelectedGroupId(null) // editing filters starts a fresh (unsaved) group definition
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const currentFilter = useMemo<GroupFilter>(
    () => ({ deacons: selDeacons, teams: selTeams, roles: selRoles, campuses: selCampuses }),
    [selDeacons, selTeams, selRoles, selCampuses],
  )

  const isEveryone = selDeacons.length === 0 && selTeams.length === 0 && selRoles.length === 0 && selCampuses.length === 0

  // Live recipient-count preview as the group definition changes, debounced
  // so every checkbox click doesn't fire its own request.
  useEffect(() => {
    if (view !== 'broadcast' || broadcastStep !== 'compose') return
    const timer = setTimeout(async () => {
      setBroadcastPreviewLoading(true)
      try {
        const data = await api<{ recipient_count: number; recipients: BroadcastRecipient[] }>('/api/sms/groups/preview', {
          method: 'POST',
          body: JSON.stringify({
            filter: currentFilter,
            active_only: broadcastActiveOnly,
            manual_only: audienceMode === 'manual',
            manual: manualRecipients.map((m) => ({ member_id: m.member_id, phone: m.phone, name: m.name, mode: 'include' })),
          }),
        })
        setBroadcastPreview(data)
      } catch {
        // transient -- count just won't update this tick
      } finally {
        setBroadcastPreviewLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [view, broadcastStep, currentFilter, broadcastActiveOnly, manualRecipients, audienceMode])

  useEffect(() => {
    if (!manualQuery.trim()) {
      setManualResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api<{ contacts: Contact[] }>(`/api/sms/contacts?q=${encodeURIComponent(manualQuery)}`)
        setManualResults(data.contacts)
      } catch {
        setManualResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [manualQuery])

  // Editing the manual list after picking a saved group turns this into a
  // fresh (unsaved) one-off definition -- otherwise confirmBroadcast would
  // send only group_id and silently drop the edit (see the preview effect
  // above, which always includes manualRecipients regardless of
  // selectedGroupId; the confirm path has to match that).
  function addManualRecipient(c: Contact) {
    if (manualRecipients.some((m) => m.phone === c.phone)) return
    setSelectedGroupId(null)
    setManualRecipients((prev) => [...prev, { member_id: c.id, phone: c.phone, name: c.name }])
    setManualQuery('')
    setManualResults([])
  }

  function removeManualRecipient(phone: string) {
    setSelectedGroupId(null)
    setManualRecipients((prev) => prev.filter((m) => m.phone !== phone))
  }

  function goToReview() {
    setBroadcastError(null)
    if (!broadcastBody.trim()) {
      setBroadcastError('Write the message first.')
      return
    }
    if (!broadcastSendAt) {
      setBroadcastError('Pick a send time.')
      return
    }
    if (audienceMode === 'manual' && manualRecipients.length === 0) {
      setBroadcastError('Add at least one person.')
      return
    }
    if (!broadcastPreview || broadcastPreview.recipient_count === 0) {
      setBroadcastError('This group has no recipients yet (no phone on file, or everything filtered out).')
      return
    }
    setRemovedPhones(new Set())
    setBroadcastStep('review')
  }

  function toggleRemoved(phone: string) {
    setRemovedPhones((prev) => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  const reviewRecipients = broadcastPreview?.recipients ?? []
  const finalRecipientCount = reviewRecipients.filter((r) => !removedPhones.has(r.phone)).length

  async function confirmBroadcast() {
    const localDate = new Date(broadcastSendAt)
    if (Number.isNaN(localDate.getTime()) || localDate <= new Date()) {
      setBroadcastError('Send time must be in the future.')
      return
    }
    const sendAt = localDate.toISOString().slice(0, 19).replace('T', ' ')

    setBroadcastScheduling(true)
    setBroadcastError(null)
    try {
      let groupId = selectedGroupId
      if (saveAsGroup && !groupId) {
        if (!saveGroupName.trim()) {
          setBroadcastError('Name this group to save it.')
          setBroadcastScheduling(false)
          return
        }
        const created = await api<{ group: SmsGroup }>('/api/sms/groups', {
          method: 'POST',
          body: JSON.stringify({
            name: saveGroupName.trim(),
            filter: currentFilter,
            active_only: broadcastActiveOnly,
            manual_only: audienceMode === 'manual',
            manual: manualRecipients.map((m) => ({ member_id: m.member_id, phone: m.phone, name: m.name, mode: 'include' })),
          }),
        })
        groupId = created.group.id
        setSavedGroups((prev) => [...prev, created.group])
      }

      await api<{ broadcast: Broadcast }>('/api/sms/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          body: broadcastBody.trim(),
          send_at: sendAt,
          ...(groupId
            ? { group_id: groupId }
            : {
                filter: currentFilter,
                active_only: broadcastActiveOnly,
                manual_only: audienceMode === 'manual',
                manual: manualRecipients.map((m) => ({ member_id: m.member_id, phone: m.phone, name: m.name, mode: 'include' })),
              }),
          exclude_phones: Array.from(removedPhones),
          spread_hours: spreadHours,
        }),
      })

      resetBroadcastComposer()
      await openBroadcastHistory()
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to schedule broadcast.')
    } finally {
      setBroadcastScheduling(false)
    }
  }

  async function openBroadcastHistory() {
    setView('broadcastHistory')
    setBroadcastsLoading(true)
    try {
      const data = await api<{ broadcasts: Broadcast[] }>('/api/sms/broadcasts')
      setBroadcasts(data.broadcasts)
    } catch {
      setBroadcasts([])
    } finally {
      setBroadcastsLoading(false)
    }
  }

  async function cancelBroadcast(id: number) {
    setBroadcasts((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'canceled' } : b)))
    await api(`/api/sms/broadcasts/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function openAttention() {
    setShowAttention(true)
    setAttentionLoading(true)
    try {
      const data = await api<{ members: AttentionMember[] }>('/api/sms/attention')
      setAttentionMembers(data.members)
    } catch {
      setAttentionMembers([])
    } finally {
      setAttentionLoading(false)
    }
  }

  // Tap-to-text from the At Risk / Critical panel -- jumps straight into an
  // existing thread when the member already has one (thread_id from the
  // member_id soft cross-reference), otherwise prefills the New Message
  // modal so a first text to them still goes through the same send path.
  function textAttentionMember(m: AttentionMember) {
    setShowAttention(false)
    if (m.thread_id) {
      openThread(m.thread_id)
      return
    }
    if (!m.phone) return
    setComposeName(m.name)
    setComposePhone(m.phone)
    setComposeContactPicked(true)
    setComposeOpen(true)
  }

  // Same tap-to-text idea, but driven by a ?phone= deep link from outside
  // this app (e.g. the deacon app's text icon) instead of the Attention
  // panel -- match on the last 10 digits since the deacon roster and this
  // app format phone numbers differently ("(302) 559-3728" vs "+13025593728").
  function last10(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10)
  }

  function openByPhone(phone: string, name: string) {
    const target = last10(phone)
    const match = target && threads.find((t) => !t.is_group && last10(t.phone) === target)
    if (match) {
      openThread(match.id)
      return
    }
    setComposeName(name)
    setComposePhone(phone)
    setComposeContactPicked(Boolean(name))
    setComposeOpen(true)
  }

  async function linkToMember(id: number, member: Member, action: 'ask' | 'overwrite' | 'keep_both') {
    setLinking(true)
    try {
      // Not the shared api() helper -- it throws away the response body on
      // any non-2xx status, but the 409 conflict response IS the useful
      // payload here (existing_phone/new_phone), not just an error to swallow.
      const res = await fetch(`/api/sms/threads/${id}/link-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          overwrite: action === 'overwrite',
          keep_both: action === 'keep_both',
        }),
      })
      const data: {
        ok?: boolean
        thread?: Thread
        error?: string
        existing_phone?: string
        new_phone?: string
      } = await res.json()
      if (data.error === 'phone_conflict') {
        setLinkConflict({
          memberId: member.id,
          memberName: member.name,
          existingPhone: data.existing_phone || '',
          newPhone: data.new_phone || '',
        })
        return
      }
      if (!res.ok || !data.thread) {
        setLinkError(data.error || `Failed (${res.status})`)
        return
      }
      setThreads((prev) => prev.map((t) => (t.id === id ? data.thread! : t)))
      setShowLinkMember(false)
      setLinkMemberQuery('')
      setLinkMemberResults([])
      setLinkConflict(null)
      setLinkError(null)
      await loadContext(id)
    } catch {
      setLinkError('Network error -- try again')
    } finally {
      setLinking(false)
    }
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
    Promise.all([loadThreads(), loadTemplates(), loadHeartbeat().catch(() => {}), loadAppSettings().catch(() => {})])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Always land on the newest message -- opening a thread, sending, or the
  // periodic poll picking up a reply should never leave you scrolled up.
  useEffect(() => {
    const el = messagesScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

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

  // Same contact-picker autocomplete as above, for whichever extra-recipient
  // row is currently being edited. activeExtraContactIndex is cleared on
  // pick (and on row removal) so it behaves like composeContactPicked.
  useEffect(() => {
    const row = activeExtraContactIndex === null ? null : extraRecipients[activeExtraContactIndex]
    if (!composeOpen || !row || !row.name.trim()) {
      setExtraContacts([])
      return
    }
    const timer = setTimeout(() => {
      api<{ contacts: Contact[] }>(`/api/sms/contacts?q=${encodeURIComponent(row.name.trim())}`)
        .then((data) => setExtraContacts(data.contacts))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [extraRecipients, activeExtraContactIndex, composeOpen])

  // Member search for linking an unmatched thread's number to an existing
  // congregation.db profile -- unlike the compose contact-picker above,
  // this deliberately includes members with no phone on file yet, since
  // that's exactly who this feature is for.
  useEffect(() => {
    if (!showLinkMember || !linkMemberQuery.trim()) {
      setLinkMemberResults([])
      return
    }
    const timer = setTimeout(() => {
      api<{ members: Member[] }>(`/api/sms/members/search?q=${encodeURIComponent(linkMemberQuery.trim())}`)
        .then((data) => setLinkMemberResults(data.members))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [linkMemberQuery, showLinkMember])

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

  // Deep-link from an external "text this person" link, e.g. /sms?phone=...
  // &name=... from the deacon app's text icon -- jumps into their thread
  // (or prefills New Message if they don't have one yet) instead of landing
  // on the plain list.
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const phone = params.get('phone')
    if (phone) {
      openByPhone(phone, params.get('name') ?? '')
      const url = new URL(window.location.href)
      url.searchParams.delete('phone')
      url.searchParams.delete('name')
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
      await loadHeartbeat().catch(() => {})
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
      await api('/api/sms/poll-now', { method: 'POST' }).catch(() => {})
      await loadThreads()
      if (activeId) await refreshActiveMessages(activeId)
    } catch {
      // transient network hiccup -- the reload below tries again anyway
    } finally {
      window.location.reload()
    }
  }

  // Pull-to-refresh on the thread list: iOS home-screen PWAs don't get
  // Safari's native pull-to-refresh (that's browser chrome, absent in
  // standalone mode), so this reimplements the gesture by hand. Only
  // starts tracking when the list is already scrolled to the very top,
  // so an ordinary scroll-down-then-up doesn't accidentally trigger it.
  function handleListTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (listScrollRef.current && listScrollRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }
  function handleListTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (pullStartY.current === null) return
    const delta = e.touches[0].clientY - pullStartY.current
    if (delta <= 0 || (listScrollRef.current && listScrollRef.current.scrollTop > 0)) {
      pullStartY.current = null
      setPullDistance(0)
      return
    }
    setPullDistance(Math.min(delta * 0.5, 90))
  }
  function handleListTouchEnd() {
    if (pullStartY.current === null) return
    pullStartY.current = null
    if (pullDistance >= PULL_THRESHOLD) {
      setPullReleased(true)
      manualRefresh()
    } else {
      setPullDistance(0)
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
    setEditingGroupName(false)
    setContext(null)
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
    patchThread(id, { unread: 0 }).catch(() => {})
    const data = await api<{ thread: Thread; messages: Message[] }>(`/api/sms/threads/${id}/messages`)
    setMessages(data.messages)
    if (data.thread.draft_text) {
      // Watson-prepped draft (see "prep a text") -- takes priority over any
      // local in-progress draft, and is cleared server-side once loaded so
      // it doesn't reappear on a later open.
      updateCompose(data.thread.draft_text)
      patchThread(id, { draft_text: null }).catch(() => {})
    }
    await Promise.all([
      loadScheduled(id).catch(() => {}),
      loadContext(id).catch(() => {}),
    ])
  }

  function updateCompose(text: string) {
    setCompose(text)
    if (activeId) saveDraft(activeId, text)
  }

  async function fixSpelling() {
    if (!compose.trim() || spellchecking) return
    setSpellchecking(true)
    try {
      const data = await api<{ text: string }>('/api/sms/spellcheck', {
        method: 'POST',
        body: JSON.stringify({ text: compose }),
      })
      updateCompose(data.text)
    } catch {
      // transient/offline -- leave the compose text untouched
    } finally {
      setSpellchecking(false)
    }
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
    setExtraRecipients([])
    setComposeText('')
    setComposeContacts([])
    setComposeContactPicked(false)
    setComposeShowSchedule(false)
    setComposeScheduleAt('')
    setActiveExtraContactIndex(null)
    setExtraContacts([])
  }

  function pickContact(c: Contact) {
    setComposeName(c.name)
    setComposePhone(c.phone)
    setComposeContactPicked(true)
    setComposeContacts([])
  }

  function pickExtraContact(i: number, c: Contact) {
    setExtraRecipients((prev) => prev.map((p, idx) => (idx === i ? { name: c.name, phone: c.phone } : p)))
    setActiveExtraContactIndex(null)
    setExtraContacts([])
  }

  async function sendNewMessage() {
    if (!composePhone.trim() || !composeText.trim() || composeSending) return
    if (composeShowSchedule && !composeScheduleAt) return
    setComposeSending(true)
    try {
      // More than one person -> a group text, resolved server-side the
      // same way an inbound group message is (matched by participant set,
      // see jobs/sms/bridge.py's get_or_create_thread_multi) so it merges
      // correctly with that group's replies either way. One person keeps
      // sending the original phone/name shape unchanged.
      const others = extraRecipients.filter((r) => r.phone.trim())
      const recipientsPayload =
        others.length > 0
          ? {
              recipients: [
                { phone: composePhone.trim(), name: composeName.trim() || undefined },
                ...others.map((r) => ({ phone: r.phone.trim(), name: r.name.trim() || undefined })),
              ],
            }
          : { phone: composePhone.trim(), name: composeName.trim() || undefined }

      let threadId: number
      if (composeShowSchedule) {
        const localDate = new Date(composeScheduleAt)
        if (Number.isNaN(localDate.getTime()) || localDate <= new Date()) return
        const sendAt = localDate.toISOString().slice(0, 19).replace('T', ' ')
        const data = await api<{ thread: Thread }>('/api/sms/schedule', {
          method: 'POST',
          body: JSON.stringify({ ...recipientsPayload, text: composeText.trim(), send_at: sendAt }),
        })
        threadId = data.thread.id
      } else {
        const data = await api<{ thread: Thread }>('/api/sms/send', {
          method: 'POST',
          body: JSON.stringify({ ...recipientsPayload, text: composeText.trim() }),
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
            <div className="flex items-center gap-2 w-full">
              {isDev && (
                <button
                  onClick={() => setInjectOpen(true)}
                  className="text-xs px-2 py-1 rounded-md border"
                  style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                >
                  + test text
                </button>
              )}
              {batteryPct !== null && (
                <div
                  aria-label={`Gateway phone battery ${batteryPct}%${gatewayOk === false ? ', unreachable' : ''}`}
                  className="h-[45px] px-2 rounded-lg border flex items-center gap-1 text-xs font-medium"
                  style={{
                    borderColor: batteryPct < 20 || gatewayOk === false ? COLORS.clay : COLORS.line,
                    color: batteryPct < 20 || gatewayOk === false ? COLORS.clay : COLORS.inkSoft,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="18" height="10" rx="2" />
                    <path d="M22 10v4" />
                    <rect
                      x="4"
                      y="9"
                      width={Math.max(1, Math.round((Math.min(100, Math.max(0, batteryPct)) / 100) * 14))}
                      height="6"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                  {batteryPct}%
                </div>
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
              {pushStatus !== 'granted' && (
              <div className="relative">
                <button
                  onClick={() => setShowPushInfo((s) => !s)}
                  aria-label="Notifications"
                  className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                  style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                {showPushInfo && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-11 z-10 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border p-3 flex flex-col gap-2 text-xs"
                    style={{ background: COLORS.surface, borderColor: COLORS.line, color: COLORS.ink }}
                  >
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
              )}
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
                className="flex-1 h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={() => setView('settings')}
                aria-label="Settings"
                className="w-[45px] h-[45px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
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

          <div
            ref={listScrollRef}
            className="flex-1 overflow-y-auto relative"
            onTouchStart={handleListTouchStart}
            onTouchMove={handleListTouchMove}
            onTouchEnd={handleListTouchEnd}
          >
            <div
              className="absolute left-0 right-0 flex items-center justify-center"
              style={{
                top: 0,
                height: 56,
                transform: `translateY(${pullDistance - 56}px)`,
                transition: pullStartY.current === null ? 'transform 0.2s' : 'none',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={pullDistance >= PULL_THRESHOLD || refreshing ? COLORS.moss : COLORS.inkSoft}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing || pullReleased ? 'animate-spin' : ''}
                style={{ transform: refreshing || pullReleased ? undefined : `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 180}deg)` }}
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
            <div
              style={{
                transform: `translateY(${pullDistance}px)`,
                transition: pullStartY.current === null ? 'transform 0.2s' : 'none',
              }}
            >
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
                style={{
                  borderColor: COLORS.line,
                  background: t.highlight_note ? COLORS.claySoft : t.unread ? COLORS.tagblueSoft : 'transparent',
                  boxShadow: t.highlight_note
                    ? `inset 3px 0 0 0 ${COLORS.clay}`
                    : t.unread
                      ? `inset 3px 0 0 0 ${COLORS.moss}`
                      : undefined,
                }}
              >
                <div
                  className="w-11 h-11 rounded-full flex-none flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: COLORS.moss }}
                >
                  {displayName(t).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-sm ${t.unread ? 'font-bold' : 'font-medium'}`}
                      style={{ color: t.unread ? COLORS.ink : undefined }}
                    >
                      {t.muted && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" style={{ color: COLORS.inkSoft }}>
                          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          <path d="M2 2l20 20" />
                        </svg>
                      )}
                      {t.snoozed_until && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" style={{ color: COLORS.inkSoft }}>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 3" />
                        </svg>
                      )}
                      {displayName(t)}
                    </span>
                    <span className={mono('text-xs flex-none')} style={{ color: t.unread ? COLORS.moss : COLORS.inkSoft, fontWeight: t.unread ? 700 : 400 }}>
                      {fmtTime(t.last_message_at)}
                    </span>
                  </div>
                  {t.highlight_note && (
                    <div className="text-xs font-semibold mb-0.5" style={{ color: COLORS.clay }}>
                      {t.highlight_note}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm truncate ${t.unread ? 'font-semibold' : ''}`}
                      style={{ color: t.unread ? COLORS.ink : COLORS.inkSoft }}
                    >
                      {t.last_message_preview}
                    </span>
                    {!!t.unread && (
                      <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: COLORS.moss }} />
                    )}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- THREAD VIEW ---- */}
      {view === 'thread' && activeThread && (
        <div className="flex flex-col h-screen overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setView('list')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Messages
            </button>
            <div className="flex-1 text-center">
              {editingGroupName ? (
                <input
                  autoFocus
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  onBlur={() => {
                    patchThread(activeThread.id, { group_name: groupNameDraft.trim() || null }).catch(() => {})
                    setEditingGroupName(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setEditingGroupName(false)
                  }}
                  placeholder="Name this group"
                  className="text-sm font-semibold text-center border-b bg-transparent outline-none w-full"
                  style={{ borderColor: COLORS.line, color: COLORS.ink }}
                />
              ) : (
                <button
                  onClick={() => {
                    if (!activeThread.is_group) return
                    setGroupNameDraft(activeThread.group_name ?? '')
                    setEditingGroupName(true)
                  }}
                  className="text-sm font-semibold"
                  disabled={!activeThread.is_group}
                >
                  {displayName(activeThread)}
                </button>
              )}
              <div className={mono('text-xs')} style={{ color: COLORS.inkSoft }}>
                {activeThread.is_group ? `${activeThread.participants.length} people` : activeThread.phone}
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
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{ borderColor: COLORS.line, color: activeThread.muted ? COLORS.clay : COLORS.inkSoft }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                {activeThread.muted && <path d="M2 2l20 20" />}
              </svg>
              {activeThread.muted ? 'Muted' : 'Mute'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSnooze((s) => !s)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: COLORS.line,
                  color: activeThread.snoozed_until ? COLORS.tagblue : COLORS.inkSoft,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                {activeThread.snoozed_until ? `Snoozed till ${fmtScheduled(activeThread.snoozed_until)}` : 'Snooze'}
              </button>
              {showSnooze && (
                <div
                  className="absolute left-0 top-9 z-10 w-60 max-w-[calc(100vw-2.5rem)] rounded-xl border p-2 flex flex-col gap-1 text-xs"
                  style={{ background: COLORS.surface, borderColor: COLORS.line, color: COLORS.ink }}
                >
                  {activeThread.snoozed_until && (
                    <button
                      className="text-left px-2 py-1.5 rounded-md"
                      style={{ background: COLORS.tagblueSoft, color: COLORS.ink }}
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
                      style={{ background: COLORS.tagblueSoft, color: COLORS.ink }}
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
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="5" rx="1" />
                <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
                <path d="M10 13h4" />
              </svg>
              {activeThread.state === 'archived' ? 'Unarchive' : 'Archive'}
            </button>
          </div>

          {context?.matched && (
            <div
              className="mx-4 mt-2 rounded-2xl border overflow-hidden relative"
              style={{ borderColor: COLORS.line, background: COLORS.surface }}
            >
              <button
                onClick={toggleContextCollapsed}
                className="w-full flex items-center gap-2 px-3 py-2"
                aria-expanded={!contextCollapsed}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none transition-transform"
                  style={{ color: COLORS.inkSoft, transform: contextCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: COLORS.inkSoft, letterSpacing: '0.06em' }}
                >
                  Pastoral context
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings((s) => !s)
                }}
                aria-label="Choose what shows here"
                className="absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ color: COLORS.inkSoft }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {!contextCollapsed && (
                <div
                  className="px-3 pb-3 pt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs border-t"
                  style={{ borderColor: COLORS.line }}
                >
                  {buildContextEntries(context, contextFields).map((entry) => (
                    <div key={entry.key} className={entry.full ? 'col-span-2' : undefined}>
                      <div
                        className="text-[10px] font-medium uppercase tracking-wide mb-0.5"
                        style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}
                      >
                        {entry.label}
                      </div>
                      <div style={{ color: COLORS.ink }}>{entry.value}</div>
                    </div>
                  ))}
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

          {context && !context.matched && !activeThread.is_group && (
            <div
              className="mx-4 mt-2 rounded-2xl border px-3 py-2 relative"
              style={{ borderColor: COLORS.line, background: COLORS.surface }}
            >
              {!showLinkMember ? (
                <button
                  onClick={() => setShowLinkMember(true)}
                  className="w-full flex items-center gap-2 text-xs"
                  style={{ color: COLORS.inkSoft }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11h-6M19 8v6" />
                  </svg>
                  This number isn&rsquo;t linked to anyone &mdash; link to a member
                </button>
              ) : (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: COLORS.ink }}>
                      Link this number to
                    </span>
                    <button
                      onClick={() => {
                        setShowLinkMember(false)
                        setLinkMemberQuery('')
                        setLinkMemberResults([])
                        setLinkConflict(null)
                        setLinkError(null)
                      }}
                      style={{ color: COLORS.inkSoft }}
                    >
                      Cancel
                    </button>
                  </div>
                  {linkError && <div style={{ color: COLORS.clay }}>{linkError}</div>}
                  {linkConflict ? (
                    <div className="flex flex-col gap-2">
                      <div style={{ color: COLORS.ink }}>
                        <strong>{linkConflict.memberName}</strong> already has {linkConflict.existingPhone} on file. Replace it with {linkConflict.newPhone}, or keep both?
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={linking}
                          onClick={() =>
                            activeThread &&
                            linkToMember(activeThread.id, { id: linkConflict.memberId, name: linkConflict.memberName, phone: linkConflict.existingPhone }, 'overwrite')
                          }
                          className="px-2.5 py-1 rounded-lg text-white disabled:opacity-50"
                          style={{ background: COLORS.clay }}
                        >
                          Replace it
                        </button>
                        <button
                          disabled={linking}
                          onClick={() =>
                            activeThread &&
                            linkToMember(activeThread.id, { id: linkConflict.memberId, name: linkConflict.memberName, phone: linkConflict.existingPhone }, 'keep_both')
                          }
                          className="px-2.5 py-1 rounded-lg text-white disabled:opacity-50"
                          style={{ background: COLORS.moss }}
                        >
                          Keep both
                        </button>
                        <button onClick={() => setLinkConflict(null)} style={{ color: COLORS.inkSoft }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        autoFocus
                        value={linkMemberQuery}
                        onChange={(e) => setLinkMemberQuery(e.target.value)}
                        placeholder="Search members by name"
                        className="rounded-lg border px-2.5 py-1.5 outline-none"
                        style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
                      />
                      {linkMemberResults.length > 0 && (
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          {linkMemberResults.map((m) => (
                            <button
                              key={m.id}
                              disabled={linking}
                              onClick={() => activeThread && linkToMember(activeThread.id, m, 'ask')}
                              className="text-left px-2 py-1.5 rounded-lg disabled:opacity-50"
                              style={{ background: COLORS.surfaceAlt, color: COLORS.ink }}
                            >
                              {m.name}
                              {m.phone && <span style={{ color: COLORS.inkSoft }}> &middot; has {m.phone} on file</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeThread.highlight_note && (
            <div
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium border-b"
              style={{ background: COLORS.claySoft, color: COLORS.clay, borderColor: COLORS.line }}
            >
              <span>{activeThread.highlight_note}</span>
              <button
                onClick={() => patchThread(activeThread.id, { highlight_note: null })}
                aria-label="Dismiss note"
                className="text-xs font-semibold flex-none px-1.5"
                style={{ color: COLORS.clay }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5" style={{ alignItems: m.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                {activeThread.is_group && m.direction === 'in' && (
                  <span className="text-xs font-semibold px-1" style={{ color: COLORS.inkSoft }}>
                    {m.sender_name || m.sender_phone || 'Someone in this group'}
                  </span>
                )}
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
                  {m.body && <span>{linkifyBody(m.body)}</span>}
                </div>
                {m.direction === 'out' && m.status === 'failed' && (
                  <span className="text-xs px-1" style={{ color: COLORS.clay }}>
                    Failed to send
                  </span>
                )}
                {m.direction === 'out' && m.status === 'delivered' && (
                  <span className="text-xs px-1" style={{ color: COLORS.inkSoft }}>
                    Delivered
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
                    {s.status === 'failed' ? (
                      <>
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                        <path d="M12 9v4M12 17h.01" />
                      </>
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 3" />
                      </>
                    )}
                  </svg>
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
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Template
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
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  Later
                </button>
                <label
                  aria-label="Attach a photo"
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer"
                  style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="15" rx="2" />
                    <circle cx="12" cy="12.5" r="3.5" />
                    <path d="M8 5l1.5-2h5L16 5" />
                  </svg>
                  Image
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
            </div>
            {showTemplates && (
              <div className="flex flex-col gap-1 rounded-lg border p-2" style={{ borderColor: COLORS.line }}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left text-xs px-2 py-1.5 rounded-md font-medium"
                    style={{ background: COLORS.tagblueSoft, color: COLORS.ink }}
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
                ref={composeGrowRef}
                value={compose}
                onChange={(e) => updateCompose(e.target.value)}
                onKeyDown={(e) => {
                  // Desktop-browser convenience: Enter sends, Shift+Enter
                  // still inserts a newline. isComposing guards against IME
                  // (e.g. Japanese/Chinese input) committing text with Enter.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    if ((compose.trim() || attachedImage) && !sending) send()
                  }
                }}
                placeholder="Write your reply"
                rows={1}
                className="flex-1 rounded-2xl border px-3.5 py-2 text-sm outline-none resize-none overflow-y-auto"
                style={{ borderColor: compose ? COLORS.moss : COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
              />
              <button
                onClick={fixSpelling}
                disabled={!compose.trim() || spellchecking}
                aria-label="Fix spelling"
                className="w-[45px] h-[45px] rounded-full flex-none border flex items-center justify-center text-sm disabled:opacity-40"
                style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
              >
                {spellchecking ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
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

      {/* ---- BROADCAST VIEW ---- */}
      {view === 'broadcast' && broadcastStep === 'compose' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setView('settings')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Settings
            </button>
            <h2 className={fraunces('flex-1 text-center text-sm font-semibold')}>Broadcast</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            {savedGroups.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                  Saved groups
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => pickSavedGroup(null)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={
                      selectedGroupId === null
                        ? { background: COLORS.moss, borderColor: COLORS.moss, color: 'white' }
                        : { borderColor: COLORS.line, color: COLORS.ink }
                    }
                  >
                    New group
                  </button>
                  {savedGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => pickSavedGroup(g.id)}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={
                        selectedGroupId === g.id
                          ? { background: COLORS.moss, borderColor: COLORS.moss, color: 'white' }
                          : { borderColor: COLORS.line, color: COLORS.ink }
                      }
                    >
                      {g.name} ({g.recipient_count})
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Who gets it
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setSelectedGroupId(null)
                    setAudienceMode('filtered')
                  }}
                  className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border"
                  style={
                    audienceMode === 'filtered'
                      ? { background: COLORS.moss, borderColor: COLORS.moss, color: 'white' }
                      : { borderColor: COLORS.line, color: COLORS.ink }
                  }
                >
                  Filtered group
                </button>
                <button
                  onClick={() => {
                    setSelectedGroupId(null)
                    setAudienceMode('manual')
                  }}
                  className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border"
                  style={
                    audienceMode === 'manual'
                      ? { background: COLORS.moss, borderColor: COLORS.moss, color: 'white' }
                      : { borderColor: COLORS.line, color: COLORS.ink }
                  }
                >
                  Just these people
                </button>
              </div>
              {audienceMode === 'filtered' && isEveryone && (
                <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                  No filters selected — this is everyone (active members with a phone on file).
                </p>
              )}
              {audienceMode === 'filtered' && (['deacons', 'teams', 'roles', 'campuses'] as const).map((dim) => {
                const labels: Record<typeof dim, string> = {
                  deacons: 'Deacon group',
                  teams: 'Serving team',
                  roles: 'Leadership role',
                  campuses: 'Campus',
                } as Record<typeof dim, string>
                const selected = { deacons: selDeacons, teams: selTeams, roles: selRoles, campuses: selCampuses }[dim]
                const setSelected = { deacons: setSelDeacons, teams: setSelTeams, roles: setSelRoles, campuses: setSelCampuses }[dim]
                const options = groupOptions?.[dim] ?? []
                if (options.length === 0) return null
                return (
                  <div key={dim} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium" style={{ color: COLORS.inkSoft }}>{labels[dim]}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => toggleDim(selected, setSelected, opt)}
                          className="text-xs px-2.5 py-1 rounded-full border"
                          style={
                            selected.includes(opt)
                              ? { background: COLORS.tagblueSoft, borderColor: COLORS.tagblue, color: COLORS.tagblue }
                              : { borderColor: COLORS.line, color: COLORS.inkSoft }
                          }
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              {audienceMode === 'filtered' && (
                <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.inkSoft }}>
                  <input
                    type="checkbox"
                    checked={broadcastActiveOnly}
                    onChange={(e) => {
                      setSelectedGroupId(null)
                      setBroadcastActiveOnly(e.target.checked)
                    }}
                  />
                  Active members only
                </label>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                {audienceMode === 'manual' ? 'People to text' : 'Add specific people to the group'}
              </h3>
              <div className="relative">
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
                />
                {manualResults.length > 0 && (
                  <div
                    className="absolute z-10 mt-1 w-full rounded-lg border shadow-sm max-h-48 overflow-y-auto"
                    style={{ borderColor: COLORS.line, background: COLORS.surface }}
                  >
                    {manualResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addManualRecipient(c)}
                        className="w-full text-left px-3 py-2 text-sm"
                        style={{ color: COLORS.ink }}
                      >
                        {c.name} <span style={{ color: COLORS.inkSoft }}>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {manualRecipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {manualRecipients.map((m) => (
                    <span
                      key={m.phone}
                      className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                      style={{ borderColor: COLORS.line, color: COLORS.ink }}
                    >
                      {m.name || m.phone}
                      <button onClick={() => removeManualRecipient(m.phone)} aria-label={`Remove ${m.name || m.phone}`}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <div
              className="rounded-2xl border p-3 flex items-center justify-between text-sm font-medium"
              style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
            >
              <span>Recipients</span>
              <span style={{ color: COLORS.moss }}>
                {broadcastPreviewLoading ? '…' : (broadcastPreview?.recipient_count ?? 0)}
              </span>
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Message
              </h3>
              <textarea
                ref={broadcastBodyGrowRef}
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Write your own exact wording — this goes out as-is, to every recipient"
                rows={3}
                className="rounded-2xl border px-3.5 py-2.5 text-sm outline-none resize-none overflow-y-auto"
                style={{ borderColor: broadcastBody ? COLORS.moss : COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Send at
              </h3>
              <input
                type="datetime-local"
                value={broadcastSendAt}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setBroadcastSendAt(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                How fast
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { label: 'Quick', value: null, hint: 'a few minutes' },
                  { label: 'A few hours', value: 4, hint: '~4h' },
                  { label: 'Across the day', value: 10, hint: '~10h, quiet hours respected' },
                ] as const).map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSpreadHours(opt.value)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border"
                    style={
                      spreadHours === opt.value
                        ? { background: COLORS.moss, borderColor: COLORS.moss, color: 'white' }
                        : { borderColor: COLORS.line, color: COLORS.ink }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                {spreadHours
                  ? `Sent one at a time, spread over about ${spreadHours}h, never between 9pm-8am — the more this reads as you individually texting people through the day, the less it looks like a mass blast to your carrier.`
                  : 'Sent one at a time, a few seconds to under a minute apart — fine for a small group, but a big send this fast can start to look like bulk messaging.'}
              </p>
            </section>

            {broadcastError && (
              <p className="text-xs font-medium" style={{ color: '#B4443A' }}>{broadcastError}</p>
            )}

            <button
              onClick={goToReview}
              className="text-sm font-semibold px-4 py-3 rounded-2xl text-white"
              style={{ background: COLORS.moss }}
            >
              Review recipients →
            </button>
          </div>
        </div>
      )}

      {view === 'broadcast' && broadcastStep === 'review' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setBroadcastStep('compose')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Edit
            </button>
            <h2 className={fraunces('flex-1 text-center text-sm font-semibold')}>Confirm broadcast</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="rounded-2xl border p-3 flex flex-col gap-2" style={{ borderColor: COLORS.line, background: COLORS.surface }}>
              <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.ink }}>{broadcastBody}</p>
              <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                Sends {broadcastSendAt ? fmtScheduled(new Date(broadcastSendAt).toISOString().slice(0, 19).replace('T', ' ')) : ''}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm font-medium">
              <span style={{ color: COLORS.ink }}>{finalRecipientCount} recipients</span>
              {removedPhones.size > 0 && (
                <span className="text-xs" style={{ color: COLORS.inkSoft }}>{removedPhones.size} removed</span>
              )}
            </div>
            {finalRecipientCount > 1 && (
              <p className="text-xs -mt-2" style={{ color: COLORS.inkSoft }}>
                Sent one at a time, at random intervals, over {estimateSpreadLabel(finalRecipientCount, spreadHours)} — not all at
                once, so this doesn&rsquo;t read as a mass text.
              </p>
            )}

            <div className="flex flex-col gap-1 rounded-2xl border p-2 max-h-80 overflow-y-auto" style={{ borderColor: COLORS.line }}>
              {reviewRecipients.map((r) => {
                const removed = removedPhones.has(r.phone)
                return (
                  <div
                    key={r.phone}
                    className="flex items-center justify-between px-2 py-1.5 text-sm rounded-lg"
                    style={{ opacity: removed ? 0.45 : 1 }}
                  >
                    <span style={{ color: COLORS.ink, textDecoration: removed ? 'line-through' : 'none' }}>
                      {r.contact_name || r.phone}
                    </span>
                    <button
                      onClick={() => toggleRemoved(r.phone)}
                      className="text-xs font-medium px-2 py-0.5 rounded-full border"
                      style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                    >
                      {removed ? 'Undo' : 'Remove'}
                    </button>
                  </div>
                )
              })}
            </div>

            {!selectedGroupId && (
              <label className="flex flex-col gap-2 rounded-2xl border p-3" style={{ borderColor: COLORS.line }}>
                <span className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
                  <input type="checkbox" checked={saveAsGroup} onChange={(e) => setSaveAsGroup(e.target.checked)} />
                  Save this group for reuse
                </span>
                {saveAsGroup && (
                  <input
                    value={saveGroupName}
                    onChange={(e) => setSaveGroupName(e.target.value)}
                    placeholder="Group name"
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: COLORS.line, background: COLORS.surfaceAlt, color: COLORS.ink }}
                  />
                )}
              </label>
            )}

            {broadcastError && (
              <p className="text-xs font-medium" style={{ color: '#B4443A' }}>{broadcastError}</p>
            )}

            <button
              onClick={confirmBroadcast}
              disabled={broadcastScheduling || finalRecipientCount === 0}
              className="text-sm font-semibold px-4 py-3 rounded-2xl text-white disabled:opacity-40"
              style={{ background: COLORS.moss }}
            >
              {broadcastScheduling ? 'Scheduling…' : `Schedule broadcast to ${finalRecipientCount}`}
            </button>
          </div>
        </div>
      )}

      {/* ---- BROADCAST HISTORY VIEW ---- */}
      {view === 'broadcastHistory' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setView('settings')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Settings
            </button>
            <h2 className={fraunces('flex-1 text-center text-sm font-semibold')}>Broadcast history</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {broadcastsLoading && <p className="text-sm text-center py-8" style={{ color: COLORS.inkSoft }}>Loading…</p>}
            {!broadcastsLoading && broadcasts.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: COLORS.inkSoft }}>No broadcasts yet.</p>
            )}
            {broadcasts.map((b) => {
              const statusColor =
                b.status === 'sent' ? COLORS.moss
                : b.status === 'failed' ? '#B4443A'
                : b.status === 'canceled' ? COLORS.inkSoft
                : COLORS.clay
              return (
                <div key={b.id} className="rounded-2xl border p-3 flex flex-col gap-1.5" style={{ borderColor: COLORS.line, background: COLORS.surface }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: statusColor }}>{b.status}</span>
                    <span className="text-xs" style={{ color: COLORS.inkSoft }}>{fmtScheduled(b.send_at)}</span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: COLORS.ink }}>{b.body}</p>
                  <div className="flex items-center justify-between text-xs" style={{ color: COLORS.inkSoft }}>
                    <span>
                      {b.group_name || 'Ad-hoc group'} · {b.recipient_count} recipients
                      {(b.status === 'sending' || b.status === 'sent' || b.status === 'failed') && ` (${b.sent_count} sent${b.failed_count ? `, ${b.failed_count} failed` : ''})`}
                    </span>
                    {b.status === 'scheduled' && (
                      <button onClick={() => cancelBroadcast(b.id)} className="font-medium" style={{ color: '#B4443A' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- TEMPLATES VIEW ---- */}
      {view === 'templates' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button
              onClick={() => {
                setView('settings')
                setAddingTemplate(false)
              }}
              style={{ color: COLORS.moss }}
              className="font-medium text-sm"
            >
              ← Settings
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

      {/* ---- SETTINGS VIEW ---- */}
      {view === 'settings' && (
        <div className="flex flex-col min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: COLORS.line }}>
            <button onClick={() => setView('list')} style={{ color: COLORS.moss }} className="font-medium text-sm">
              ← Messages
            </button>
            <h2 className={fraunces('flex-1 text-center text-sm font-semibold')}>Settings</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Appearance
              </h3>
              <div className="rounded-2xl border p-3 flex flex-col gap-3" style={{ borderColor: COLORS.line, background: COLORS.surface }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mode</span>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border"
                    style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
                  >
                    {theme === 'dark' ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                        </svg>
                        Dark
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                        </svg>
                        Light
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm">Theme</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCENT_THEMES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => chooseAccentTheme(t.key)}
                        className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5"
                        style={{
                          borderColor: accentTheme === t.key ? t.swatch : COLORS.line,
                          borderWidth: accentTheme === t.key ? 2 : 1,
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: t.swatch }}
                        >
                          {accentTheme === t.key && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>{t.label}</span>
                      </button>
                    ))}
                    <label
                      className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 cursor-pointer relative"
                      style={{
                        borderColor: accentTheme === 'custom' ? customAccentHex : COLORS.line,
                        borderWidth: accentTheme === 'custom' ? 2 : 1,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-none"
                        style={{
                          background: accentTheme === 'custom'
                            ? customAccentHex
                            : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                        }}
                      >
                        {accentTheme === 'custom' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>Custom</span>
                      <input
                        type="color"
                        value={customAccentHex}
                        onChange={(e) => chooseCustomAccentHex(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        aria-label="Pick a custom accent color"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Messaging
              </h3>
              <button
                onClick={() => setView('templates')}
                className="rounded-2xl border p-3 flex items-center justify-between text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              >
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Saved templates
                </span>
                <span style={{ color: COLORS.inkSoft }}>{templates.length} &rsaquo;</span>
              </button>
              <button
                onClick={openBroadcast}
                className="rounded-2xl border p-3 flex items-center justify-between text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              >
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
                  </svg>
                  Broadcast a message
                </span>
                <span style={{ color: COLORS.inkSoft }}>&rsaquo;</span>
              </button>
              <button
                onClick={openBroadcastHistory}
                className="rounded-2xl border p-3 flex items-center justify-between text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              >
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  Broadcast history
                </span>
                <span style={{ color: COLORS.inkSoft }}>&rsaquo;</span>
              </button>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Pastoral
              </h3>
              <button
                onClick={openAttention}
                className="rounded-2xl border p-3 flex items-center justify-between text-sm"
                style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
              >
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  At Risk, Critical &amp; Disconnected
                </span>
                <span style={{ color: COLORS.inkSoft }}>&rsaquo;</span>
              </button>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft, letterSpacing: '0.05em' }}>
                Availability
              </h3>
              <div className="rounded-2xl border p-3 flex flex-col gap-3" style={{ borderColor: COLORS.line, background: COLORS.surface }}>
                <label className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm">Friday Sabbath</span>
                    <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                      Silences calls and texts every Friday, 12:00am&ndash;11:59pm, for family Sabbath.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    disabled={savingSettings}
                    checked={sabbathSilence}
                    onChange={(e) => updateAppSetting({ sabbath_silence: e.target.checked })}
                    className="mt-1 flex-none"
                  />
                </label>
                <div className="h-px" style={{ background: COLORS.line }} />
                <label className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm">Vacation mode</span>
                    <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                      Silences all calls and texts until you turn this back off.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    disabled={savingSettings}
                    checked={vacationMode}
                    onChange={(e) => updateAppSetting({ vacation_mode: e.target.checked })}
                    className="mt-1 flex-none"
                  />
                </label>
              </div>
            </section>
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
            {extraRecipients.map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="relative">
                    <input
                      value={r.name}
                      onChange={(e) => {
                        const val = e.target.value
                        setExtraRecipients((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: val } : p)))
                        setActiveExtraContactIndex(i)
                      }}
                      placeholder="Name -- search contacts or type your own"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
                    />
                    {activeExtraContactIndex === i && extraContacts.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border max-h-40 overflow-y-auto flex flex-col"
                        style={{ background: COLORS.surface, borderColor: COLORS.line }}
                      >
                        {extraContacts.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => pickExtraContact(i, c)}
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
                    value={r.phone}
                    onChange={(e) =>
                      setExtraRecipients((prev) => prev.map((p, idx) => (idx === i ? { ...p, phone: e.target.value } : p)))
                    }
                    placeholder="Phone number"
                    inputMode="tel"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
                  />
                </div>
                <button
                  onClick={() => {
                    setExtraRecipients((prev) => prev.filter((_, idx) => idx !== i))
                    setActiveExtraContactIndex(null)
                    setExtraContacts([])
                  }}
                  className="text-xs px-2 py-2"
                  style={{ color: COLORS.inkSoft }}
                  aria-label="Remove recipient"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setExtraRecipients((prev) => [...prev, { phone: '', name: '' }])}
              className="text-xs font-medium self-start"
              style={{ color: COLORS.moss }}
            >
              + Add another person
            </button>
            <textarea
              ref={composeTextGrowRef}
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  const disabled = !composePhone.trim() || !composeText.trim() || (composeShowSchedule && !composeScheduleAt) || composeSending
                  if (!disabled) sendNewMessage()
                }
              }}
              placeholder="Message text"
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm resize-none overflow-y-auto"
              style={{ borderColor: COLORS.line, background: COLORS.surface, color: COLORS.ink }}
            />
            <button
              onClick={() => setComposeShowSchedule((s) => !s)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border self-start"
              style={{ borderColor: COLORS.tagblue, color: COLORS.tagblue }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              {composeShowSchedule ? 'Sending later' : 'Send now'}
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

      {/* ---- AT RISK / CRITICAL MODAL ---- */}
      {showAttention && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-20">
          <div className="w-full max-w-sm max-h-[80vh] rounded-2xl p-5 flex flex-col gap-3" style={{ background: COLORS.surface, color: COLORS.ink }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">At Risk, Critical &amp; Disconnected</h3>
              <button onClick={() => setShowAttention(false)} className="text-sm px-1" style={{ color: COLORS.inkSoft }}>
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {attentionLoading && (
                <div className="text-sm py-4 text-center" style={{ color: COLORS.inkSoft }}>Loading…</div>
              )}
              {!attentionLoading && attentionMembers.length === 0 && (
                <div className="text-sm py-4 text-center" style={{ color: COLORS.inkSoft }}>
                  Nobody&rsquo;s at risk, critical, or disconnected right now.
                </div>
              )}
              {!attentionLoading && attentionMembers.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border p-3 flex items-center gap-3"
                  style={{ borderColor: COLORS.line }}
                >
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium truncate">{m.name}</span>
                    <span className="text-xs font-medium" style={{ color: m.bucket === 'critical' ? COLORS.clay : m.bucket === 'disconnected' ? COLORS.ink : COLORS.inkSoft }}>
                      {m.bucket === 'critical' ? '\u{1F534} Critical' : m.bucket === 'disconnected' ? '⚫ Disconnected' : '⚠️ At Risk'} &middot; {m.weeks_absent} {m.weeks_absent === 1 ? 'week' : 'weeks'} absent
                    </span>
                  </div>
                  <button
                    onClick={() => textAttentionMember(m)}
                    disabled={!m.phone && !m.thread_id}
                    className="text-xs px-3 py-1.5 rounded-lg text-white flex-none disabled:opacity-40"
                    style={{ background: COLORS.moss }}
                  >
                    Text
                  </button>
                </div>
              ))}
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
