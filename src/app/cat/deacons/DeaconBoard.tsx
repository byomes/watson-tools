'use client'
import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { EditableSelect } from './EditableSelect'
import { formatDeaconNoteDate } from '@/lib/deaconNotes'

interface PrayerRequest {
  request_text: string
  date: string
}

interface NextStep {
  step: string
  label: string
  date: string
}

interface DeaconNote {
  note: string
  status: string
  created_at: string
}

interface Person {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  birthdate: string | null
  household_id: string | null
  household_role: string | null
  deacon: string | null
  deacon_status: string | null
  member_status: string | null
  last_seen: string
  prayer_requests: PrayerRequest[]
  next_steps: NextStep[]
  deacon_notes: DeaconNote[]
}

const DEFAULT_STATUS_OPTIONS = ['Partner', 'Remote Partner', 'Unassigned Partner', 'Inactive Partner']
const UNASSIGNED = '__unassigned__'

const MEMBER_STATUS_LABELS: Record<string, string> = {
  disconnected: 'Disconnected',
  non_local: 'Non-local',
  snowbird: 'Snowbird',
  deceased: 'Deceased',
}

// Mirrors jobs/congregation/deacon_reports.py's _attendance_line() thresholds.
function attendanceRisk(lastSeen: string): { label: string; className: string } | null {
  if (!lastSeen || lastSeen === '1900-01-01') return null
  const weeks = Math.floor((Date.now() - new Date(`${lastSeen}T00:00:00`).getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (weeks >= 6) return { label: 'Critical', className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800' }
  if (weeks >= 3) return { label: 'At Risk', className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' }
  return null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type DeaconNoteState = 'idle' | 'saving' | 'saved' | 'error'

function formatLastSeen(lastSeen: string): string {
  if (!lastSeen || lastSeen === '1900-01-01') return 'Never'
  try {
    return new Date(`${lastSeen}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return lastSeen
  }
}

// Last name (final whitespace-separated token), for sorting families together.
function lastNameKey(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length ? parts[parts.length - 1].toLowerCase() : ''
}

// Same "last name = final token" convention as lastNameKey above, so a
// name like "Dan Jr Barry" splits as first="Dan Jr" / last="Barry" -- the
// same person lastNameKey already sorts under "Barry" today.
function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

function byLastName(a: Person, b: Person): number {
  const byLast = lastNameKey(a.name).localeCompare(lastNameKey(b.name))
  return byLast !== 0 ? byLast : a.name.localeCompare(b.name)
}

// tel: links need digits (and a leading +); strip formatting punctuation like (555) 123-4567.
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// Google Maps' universal search link -- opens the native Maps/navigation app
// on iOS and Android when one is installed, falls back to Google Maps in the
// browser otherwise. No platform sniffing needed.
function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function Field({
  label,
  value,
  onCommit,
  type = 'text',
}: {
  label: string
  value: string
  onCommit: (value: string) => void
  type?: 'text' | 'date'
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        defaultValue={value}
        onBlur={(e) => onCommit(e.target.value)}
        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
      />
    </div>
  )
}

function DeaconNoteForm({ personId, onSubmit }: { personId: number; onSubmit: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState('')
  const [state, setState] = useState<DeaconNoteState>('idle')

  async function submit() {
    const trimmed = note.trim()
    if (!trimmed) return
    setState('saving')
    const ok = await onSubmit(trimmed)
    if (ok) {
      setNote('')
      setState('saved')
      setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } else {
      setState('error')
    }
  }

  return (
    <div className="pt-3 border-t border-gray-200">
      <label
        htmlFor={`deacon-note-${personId}`}
        className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
      >
        Log a deacon note
      </label>
      <textarea
        id={`deacon-note-${personId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Called, texted, visited…"
        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={!note.trim() || state === 'saving'}
          className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 border border-blue-700 dark:border-blue-500 rounded-lg px-3 py-1.5 disabled:opacity-40"
        >
          {state === 'saving' ? 'Saving…' : 'Log Note'}
        </button>
        {state === 'saved' && <span className="text-xs text-green-700 dark:text-green-400 font-semibold">Saved ✓</span>}
        {state === 'error' && <span className="text-xs text-red-700 dark:text-red-400 font-semibold">Failed — try again</span>}
      </div>
    </div>
  )
}

// Typeahead over the full roster (hundreds of names -- a plain <select>
// like EditableSelect's isn't usable at that size). Filters client-side
// since `people` is already fully loaded; no separate search endpoint.
function PersonChip({
  name,
  tone,
  onRemove,
  removeTitle,
  disabled,
}: {
  name: string
  tone: 'blue' | 'purple' | 'emerald'
  onRemove: () => void
  removeTitle: string
  disabled?: boolean
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    purple: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full border text-sm font-bold ${toneClasses}`}>
      {name}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        title={removeTitle}
        aria-label={removeTitle}
        className="rounded-full w-4 h-4 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path
            fillRule="evenodd"
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </span>
  )
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-blue-700 dark:border-blue-500 text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wide hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path fillRule="evenodd" d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
      {label}
    </button>
  )
}

function RelationPickerModal({
  title,
  people,
  excludeIds,
  onPick,
  onClose,
  onPersonCreated,
}: {
  title: string
  people: Person[]
  excludeIds: Set<number>
  onPick: (id: number) => void
  onClose: () => void
  onPersonCreated: (person: Person) => void
}) {
  const [query, setQuery] = useState('')
  const [showAddNew, setShowAddNew] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = people.filter((p) => !excludeIds.has(p.id))
    return (q ? pool.filter((p) => p.name.toLowerCase().includes(q)) : pool).slice(0, 30)
  }, [people, excludeIds, query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-gray-900 border-t-2 sm:border-2 border-gray-200 dark:border-gray-700 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          />
        </div>
        <ul className="overflow-y-auto flex-1">
          {matches.length === 0 && <li className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">No matches</li>}
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowAddNew(true)}
            className="w-full text-center text-sm font-semibold text-blue-700 dark:text-blue-400 py-1.5"
          >
            Can&apos;t find them? + Add a new person
          </button>
        </div>
      </div>
      {showAddNew && (
        <AddPersonModal
          title="Add New Person"
          onClose={() => setShowAddNew(false)}
          onCreated={(person) => {
            onPersonCreated(person)
            setShowAddNew(false)
            onPick(person.id)
          }}
        />
      )}
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoFocus?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
      />
    </div>
  )
}

function AddPersonModal({
  title,
  onCreated,
  onClose,
}: {
  title: string
  onCreated: (person: Person) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/cat/deacons/member/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address, birthdate }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error ?? 'Failed to add person')
        setSaving(false)
        return
      }
      if (body.created) onCreated(body.created as Person)
      else onClose()
    } catch {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-gray-900 border-t-2 sm:border-2 border-gray-200 dark:border-gray-700 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</div>
          <button type="button" onClick={onClose} className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <LabeledInput label="Name" value={name} onChange={setName} autoFocus />
          <LabeledInput label="Email" type="email" value={email} onChange={setEmail} />
          <LabeledInput label="Phone" type="tel" value={phone} onChange={setPhone} />
          <LabeledInput label="Address" value={address} onChange={setAddress} />
          <LabeledInput label="Birthdate" type="date" value={birthdate} onChange={setBirthdate} />
          {error && <div className="text-xs text-red-700 dark:text-red-400">{error}</div>}
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition"
          >
            {saving ? 'Adding…' : 'Add Person'}
          </button>
        </div>
      </div>
    </div>
  )
}

type FamilySaveState = 'idle' | 'saving' | 'error'

// Reads current spouse/children/parent straight off household_id +
// household_role in the already-loaded roster (no separate fetch) --
// see jobs/congregation/family_edit.py / migrate_household_role.py.
// Every logged-in deacon can act here (Bill's 2026-09-12 request to open
// family management to all leaders, not just Telegram's small allowlist).
function FamilySection({
  person: p,
  allPeople,
  onMarkSpouse,
  onMarkChild,
  onAddChild,
  onUnlinkMember,
  onPersonCreated,
}: {
  person: Person
  allPeople: Person[]
  onMarkSpouse: (otherId: number, otherRole: 'husband' | 'wife') => Promise<string | null>
  onMarkChild: (parentId: number) => Promise<string | null>
  onAddChild: (childId: number) => Promise<string | null>
  onUnlinkMember: (memberId: number) => Promise<string | null>
  onPersonCreated: (person: Person) => void
}) {
  const [state, setState] = useState<FamilySaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<'spouse-husband' | 'spouse-wife' | 'parent' | 'child' | null>(null)

  const householdMates = useMemo(
    () => (p.household_id ? allPeople.filter((m) => m.id !== p.id && m.household_id === p.household_id) : []),
    [allPeople, p.household_id, p.id]
  )
  const spouse = householdMates.find((m) => m.household_role === 'husband' || m.household_role === 'wife')
  const children = householdMates.filter((m) => m.household_role === 'child')
  const parents =
    p.household_role === 'child'
      ? householdMates.filter((m) => m.household_role === 'husband' || m.household_role === 'wife' || m.household_role === 'head')
      : []
  const excludeIds = useMemo(() => new Set([p.id, ...householdMates.map((m) => m.id)]), [p.id, householdMates])

  async function run(action: () => Promise<string | null>) {
    setState('saving')
    setError(null)
    const err = await action()
    setState(err ? 'error' : 'idle')
    setError(err)
  }

  function handlePick(id: number) {
    const modal = activeModal
    setActiveModal(null)
    if (modal === 'spouse-husband') run(() => onMarkSpouse(id, 'husband'))
    else if (modal === 'spouse-wife') run(() => onMarkSpouse(id, 'wife'))
    else if (modal === 'parent') run(() => onMarkChild(id))
    else if (modal === 'child') run(() => onAddChild(id))
  }

  const modalTitle =
    activeModal === 'spouse-husband'
      ? `Add husband for ${p.name}`
      : activeModal === 'spouse-wife'
        ? `Add wife for ${p.name}`
        : activeModal === 'parent'
          ? `Mark ${p.name} as child of…`
          : activeModal === 'child'
            ? `Add ${p.name}'s child`
            : ''

  const spouseSectionLabel = spouse ? (spouse.household_role === 'husband' ? 'Husband' : 'Wife') : 'Spouse'

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
        </svg>
        Family
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{spouseSectionLabel}</span>
          {!spouse && (
            <div className="flex gap-1.5">
              <AddButton label="Husband" onClick={() => setActiveModal('spouse-husband')} disabled={state === 'saving'} />
              <AddButton label="Wife" onClick={() => setActiveModal('spouse-wife')} disabled={state === 'saving'} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {spouse ? (
            <PersonChip
              key={spouse.id}
              name={spouse.name}
              tone="blue"
              disabled={state === 'saving'}
              removeTitle={`Remove ${spouse.name} as spouse`}
              onRemove={() => run(() => onUnlinkMember(spouse.id))}
            />
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">No spouse on file</span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Parent</span>
          <AddButton label="Add" onClick={() => setActiveModal('parent')} disabled={state === 'saving'} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {parents.length > 0 ? (
            parents.map((s) => (
              <PersonChip
                key={s.id}
                name={s.name}
                tone="purple"
                disabled={state === 'saving'}
                removeTitle={`Remove ${p.name} as ${s.name}'s child`}
                onRemove={() => run(() => onUnlinkMember(p.id))}
              />
            ))
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">Not marked as anyone’s child</span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Children</span>
          <AddButton label="Add" onClick={() => setActiveModal('child')} disabled={state === 'saving'} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {children.length > 0 ? (
            children.map((c) => (
              <PersonChip
                key={c.id}
                name={c.name}
                tone="emerald"
                disabled={state === 'saving'}
                removeTitle={`Remove ${c.name} as child`}
                onRemove={() => run(() => onUnlinkMember(c.id))}
              />
            ))
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">No children on file</span>
          )}
        </div>
      </div>

      {state === 'saving' && <div className="text-xs text-gray-500 dark:text-gray-400">Saving…</div>}
      {error && <div className="text-xs text-red-700 dark:text-red-400">{error}</div>}

      {activeModal && (
        <RelationPickerModal
          title={modalTitle}
          people={allPeople}
          excludeIds={excludeIds}
          onPick={handlePick}
          onClose={() => setActiveModal(null)}
          onPersonCreated={onPersonCreated}
        />
      )}
    </div>
  )
}

function PersonCard({
  person: p,
  isOpen,
  onToggle,
  saveState,
  deaconOptions,
  statusOptions,
  allPeople,
  onUpdateField,
  onAddDeaconOption,
  onAddStatusOption,
  onSubmitDeaconNote,
  onMarkSpouse,
  onMarkChild,
  onAddChild,
  onUnlinkMember,
  onPersonCreated,
}: {
  person: Person
  isOpen: boolean
  onToggle: () => void
  saveState: SaveState | undefined
  deaconOptions: string[]
  statusOptions: string[]
  allPeople: Person[]
  onUpdateField: (field: keyof Person, value: string) => void
  onAddDeaconOption: (name: string) => void
  onAddStatusOption: (status: string) => void
  onSubmitDeaconNote: (note: string) => Promise<boolean>
  onMarkSpouse: (otherId: number, otherRole: 'husband' | 'wife') => Promise<string | null>
  onMarkChild: (parentId: number) => Promise<string | null>
  onAddChild: (childId: number) => Promise<string | null>
  onUnlinkMember: (memberId: number) => Promise<string | null>
  onPersonCreated: (person: Person) => void
}) {
  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">{p.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {p.deacon || 'Unassigned'} · Last seen: {formatLastSeen(p.last_seen)}
          </div>
          {(p.phone || p.email || p.address) && (
            <div className="flex flex-col gap-0.5 mt-1.5 text-xs">
              {p.phone && (
                <a href={telHref(p.phone)} className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium">
                  {p.phone}
                </a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium break-all">
                  {p.email}
                </a>
              )}
              {p.address && (
                <a
                  href={mapsHref(p.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                >
                  {p.address}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs whitespace-nowrap">
            {saveState === 'saving' && <span className="text-gray-500 dark:text-gray-400">Saving…</span>}
            {saveState === 'saved' && <span className="text-green-700 dark:text-green-400 font-semibold">Saved ✓</span>}
            {saveState === 'error' && <span className="text-red-700 dark:text-red-400 font-semibold">Failed</span>}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 whitespace-nowrap"
          >
            {isOpen ? 'Done' : 'Open'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {(() => {
            const { first, last } = splitName(p.name)
            return (
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="First Name"
                  value={first}
                  onCommit={(v) => onUpdateField('name', `${v.trim()} ${last}`.trim())}
                />
                <Field
                  label="Last Name"
                  value={last}
                  onCommit={(v) => onUpdateField('name', `${first} ${v.trim()}`.trim())}
                />
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Deacon</label>
              <EditableSelect
                value={p.deacon ?? ''}
                options={deaconOptions}
                placeholder="Unassigned"
                onChange={(v) => onUpdateField('deacon', v)}
                onAddOption={onAddDeaconOption}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</label>
              <EditableSelect
                value={p.deacon_status ?? ''}
                options={statusOptions}
                placeholder="—"
                onChange={(v) => onUpdateField('deacon_status', v)}
                onAddOption={onAddStatusOption}
              />
            </div>
          </div>

          <Field label="Email" value={p.email ?? ''} onCommit={(v) => onUpdateField('email', v)} />
          <Field label="Phone" value={p.phone ?? ''} onCommit={(v) => onUpdateField('phone', v)} />
          <Field label="Address" value={p.address ?? ''} onCommit={(v) => onUpdateField('address', v)} />
          <Field
            label="Birthdate"
            type="date"
            value={p.birthdate ?? ''}
            onCommit={(v) => onUpdateField('birthdate', v)}
          />

          <FamilySection
            person={p}
            allPeople={allPeople}
            onMarkSpouse={onMarkSpouse}
            onMarkChild={onMarkChild}
            onAddChild={onAddChild}
            onUnlinkMember={onUnlinkMember}
            onPersonCreated={onPersonCreated}
          />

          {(() => {
            const statusLabel = p.member_status ? MEMBER_STATUS_LABELS[p.member_status] : null
            const risk = attendanceRisk(p.last_seen)
            const hasPrayers = p.prayer_requests.length > 0
            const hasSteps = p.next_steps.length > 0
            if (!statusLabel && !risk && !hasPrayers && !hasSteps) return null
            return (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {(statusLabel || risk) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusLabel && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                        {statusLabel}
                      </span>
                    )}
                    {risk && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${risk.className}`}>
                        {risk.label}
                      </span>
                    )}
                  </div>
                )}
                {hasPrayers && (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Prayer Requests</div>
                    <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-1 list-disc list-inside">
                      {p.prayer_requests.map((pr, i) => (
                        <li key={i}>
                          {pr.request_text} <span className="text-gray-400 dark:text-gray-500 text-xs">({formatLastSeen(pr.date)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasSteps && (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Next Steps</div>
                    <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-1 list-disc list-inside">
                      {p.next_steps.map((ns, i) => (
                        <li key={i}>
                          {ns.label} <span className="text-gray-400 dark:text-gray-500 text-xs">({formatLastSeen(ns.date)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}

          {p.deacon_notes.length > 0 && (
            <details className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer select-none text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Deacon Notes ({p.deacon_notes.length})
              </summary>
              <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-1 list-disc list-inside mt-2">
                {p.deacon_notes.map((dn, i) => (
                  <li key={i}>
                    {dn.note}{' '}
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      ({formatDeaconNoteDate(dn.created_at)}
                      {dn.status !== 'open' ? ` · ${dn.status}` : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <DeaconNoteForm personId={p.id} onSubmit={onSubmitDeaconNote} />
        </div>
      )}
    </div>
  )
}

function CardGrid({ people, cardProps }: { people: Person[]; cardProps: (p: Person) => React.ComponentProps<typeof PersonCard> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {people.map((p) => (
        <PersonCard key={p.id} {...cardProps(p)} />
      ))}
    </div>
  )
}

function CollapsedSection({
  title,
  people,
  cardProps,
}: {
  title: string
  people: Person[]
  cardProps: (p: Person) => React.ComponentProps<typeof PersonCard>
}) {
  if (people.length === 0) return null
  return (
    <details className="mt-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {title} ({people.length})
      </summary>
      <div className="px-4 pb-4">
        <CardGrid people={people} cardProps={cardProps} />
      </div>
    </details>
  )
}

export type DeaconBoardHandle = { openAddPerson: () => void }

const DeaconBoard = forwardRef<DeaconBoardHandle>(function DeaconBoard(_props, ref) {
  const [people, setPeople] = useState<Person[]>([])
  const [deacons, setDeacons] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>(DEFAULT_STATUS_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deaconFilter, setDeaconFilter] = useState('')
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({})
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [showGlobalAddPerson, setShowGlobalAddPerson] = useState(false)

  useImperativeHandle(ref, () => ({ openAddPerson: () => setShowGlobalAddPerson(true) }))

  function insertPerson(person: Person) {
    setPeople((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]))
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [peopleRes, deaconsRes] = await Promise.all([
        fetch('/api/cat/deacons/roster'),
        fetch('/api/cat/deacons/list'),
      ])
      if (!peopleRes.ok || !deaconsRes.ok) {
        const failed = !peopleRes.ok ? peopleRes : deaconsRes
        const body = await failed.json().catch(() => null)
        const detail = body?.error ?? `HTTP ${failed.status}`
        throw new Error(detail)
      }
      const peopleData: Person[] = await peopleRes.json()
      const deaconsData: string[] = await deaconsRes.json()
      setPeople(peopleData)
      setDeacons(deaconsData)
      setStatusOptions((prev) => {
        const extra = peopleData.map((p) => p.deacon_status).filter((s): s is string => !!s && !prev.includes(s))
        return extra.length ? [...prev, ...Array.from(new Set(extra))] : prev
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      setLoadError(detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // "Inactive" is a deliberate bucket, not a real deacon — the backend
  // excludes it from the fetched deacon list (list_deacons()) so it never
  // gets its own Master Report section, but it must still be selectable
  // right here, on a person's own card.
  const deaconOptions = useMemo(() => [...deacons, 'Inactive'], [deacons])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return people
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => {
        if (!deaconFilter) return true
        if (deaconFilter === UNASSIGNED) return !p.deacon
        return p.deacon === deaconFilter
      })
      .sort(byLastName)
  }, [people, search, deaconFilter])

  // Default browsing view (no search, no deacon filter): keep unassigned and
  // inactive people out of the main list so deacons aren't re-scanning past
  // them every time — they're one tap away in the collapsed sections below,
  // not gone. Searching or picking a specific filter shows a flat, unsplit
  // list instead, since at that point the person is deliberately looking
  // across all of them (including "Unassigned"/"Inactive" from the filter
  // dropdown, which already narrows to just that bucket on its own).
  const grouped = !search.trim() && !deaconFilter

  const { mainList, unassignedList, inactiveList } = useMemo(() => {
    if (!grouped) return { mainList: filtered, unassignedList: [], inactiveList: [] }
    return {
      mainList: filtered.filter((p) => p.deacon && p.deacon !== 'Inactive'),
      unassignedList: filtered.filter((p) => !p.deacon),
      inactiveList: filtered.filter((p) => p.deacon === 'Inactive'),
    }
  }, [filtered, grouped])

  async function updateField(id: number, field: keyof Person, value: string) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
    setSaveState((s) => ({ ...s, [id]: 'saving' }))
    try {
      const res = await fetch(`/api/cat/deacons/member/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('save failed')
      const updated: Person = await res.json()
      setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setSaveState((s) => ({ ...s, [id]: 'saved' }))
    } catch {
      setSaveState((s) => ({ ...s, [id]: 'error' }))
    } finally {
      setTimeout(() => {
        setSaveState((s) => (s[id] === 'saving' ? s : { ...s, [id]: 'idle' }))
      }, 2000)
    }
  }

  async function submitDeaconNote(id: number, note: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/cat/deacons/member/${id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) return false
      const created: DeaconNote = await res.json()
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deacon_notes: [created, ...p.deacon_notes] } : p))
      )
      return true
    } catch {
      return false
    }
  }

  function addDeaconOption(name: string) {
    setDeacons((prev) => (prev.includes(name) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b))))
  }

  function addStatusOption(status: string) {
    setStatusOptions((prev) => (prev.includes(status) ? prev : [...prev, status]))
  }

  // Both family routes change TWO people's household_id/household_role at
  // once, so the response carries both updated rows (see
  // deacons_web.py::_roster_rows) -- patched into `people` here rather than
  // re-fetching the whole roster.
  async function markFamily(path: string, body: Record<string, number | string>): Promise<string | null> {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const resBody = await res.json().catch(() => ({}))
      if (!res.ok) return resBody?.error ?? 'Failed to save'
      const updated: Person[] = resBody.updated ?? []
      setPeople((prev) => prev.map((p) => updated.find((u) => u.id === p.id) ?? p))
      return null
    } catch {
      return 'Network error'
    }
  }

  function markSpouse(memberId: number, spouseId: number, spouseRole: 'husband' | 'wife'): Promise<string | null> {
    return markFamily('/api/cat/deacons/family/spouse', { memberId, spouseId, spouseRole })
  }

  function markChild(childId: number, parentId: number): Promise<string | null> {
    return markFamily('/api/cat/deacons/family/child', { childId, parentId })
  }

  function unlinkMember(memberId: number): Promise<string | null> {
    return markFamily('/api/cat/deacons/family/unlink', { memberId })
  }

  function cardProps(p: Person): React.ComponentProps<typeof PersonCard> {
    return {
      person: p,
      isOpen: expandedIds.has(p.id),
      onToggle: () => toggleExpanded(p.id),
      saveState: saveState[p.id],
      deaconOptions,
      statusOptions,
      allPeople: people,
      onUpdateField: (field, value) => updateField(p.id, field, value),
      onAddDeaconOption: addDeaconOption,
      onAddStatusOption: addStatusOption,
      onSubmitDeaconNote: (note) => submitDeaconNote(p.id, note),
      onMarkSpouse: (otherId, otherRole) => markSpouse(p.id, otherId, otherRole),
      onMarkChild: (parentId) => markChild(p.id, parentId),
      onAddChild: (childId) => markChild(childId, p.id),
      onUnlinkMember: (memberId) => unlinkMember(memberId),
      onPersonCreated: insertPerson,
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm px-4 py-8">Loading…</p>
  }

  if (loadError) {
    return (
      <div className="px-4 py-8 max-w-md">
        <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-1">Could not load the roster from Watson.</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 border border-blue-700 dark:border-blue-500 rounded-lg px-4 py-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
        />
        <select
          value={deaconFilter}
          onChange={(e) => setDeaconFilter(e.target.value)}
          className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
        >
          <option value="">All deacons</option>
          {deacons.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={UNASSIGNED}>Unassigned</option>
          <option value="Inactive">Inactive</option>
        </select>
        <span className="text-xs text-gray-600 dark:text-gray-400 self-center whitespace-nowrap font-medium">
          {filtered.length} of {people.length}
        </span>
      </div>

      <CardGrid people={mainList} cardProps={cardProps} />

      {grouped && (
        <>
          <CollapsedSection title="Unassigned" people={unassignedList} cardProps={cardProps} />
          <CollapsedSection title="Inactive" people={inactiveList} cardProps={cardProps} />
        </>
      )}

      {showGlobalAddPerson &&
        typeof document !== 'undefined' &&
        createPortal(
          <AddPersonModal
            title="Add New Person"
            onClose={() => setShowGlobalAddPerson(false)}
            onCreated={(person) => {
              insertPerson(person)
              setShowGlobalAddPerson(false)
            }}
          />,
          document.body
        )}
    </div>
  )
})

export default DeaconBoard
