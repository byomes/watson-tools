'use client'
import { useEffect, useMemo, useState } from 'react'
import { EditableSelect } from './EditableSelect'

interface PrayerRequest {
  request_text: string
  date: string
}

interface NextStep {
  step: string
  label: string
  date: string
}

interface Person {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  household_id: string | null
  deacon: string | null
  deacon_status: string | null
  member_status: string | null
  last_seen: string
  prayer_requests: PrayerRequest[]
  next_steps: NextStep[]
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
  if (weeks >= 6) return { label: 'Critical', className: 'text-red-700 bg-red-50 border-red-300' }
  if (weeks >= 3) return { label: 'At Risk', className: 'text-amber-700 bg-amber-50 border-amber-300' }
  return null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type FollowUpState = 'idle' | 'saving' | 'saved' | 'error'
type SortMode = 'name' | 'deacon'

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

// tel: links need digits (and a leading +); strip formatting punctuation like (555) 123-4567.
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function Field({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type="text"
        defaultValue={value}
        onBlur={(e) => onCommit(e.target.value)}
        className="w-full bg-white border-2 border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
      />
    </div>
  )
}

function FollowUpForm({ personId, onSubmit }: { personId: number; onSubmit: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState('')
  const [state, setState] = useState<FollowUpState>('idle')

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
        htmlFor={`followup-${personId}`}
        className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
      >
        Log a follow-up
      </label>
      <textarea
        id={`followup-${personId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Called, texted, visited…"
        className="w-full bg-white border-2 border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={!note.trim() || state === 'saving'}
          className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-700 rounded-lg px-3 py-1.5 disabled:opacity-40"
        >
          {state === 'saving' ? 'Saving…' : 'Log Follow-Up'}
        </button>
        {state === 'saved' && <span className="text-xs text-green-700 font-semibold">Saved ✓</span>}
        {state === 'error' && <span className="text-xs text-red-700 font-semibold">Failed — try again</span>}
      </div>
    </div>
  )
}

export default function DeaconBoard() {
  const [people, setPeople] = useState<Person[]>([])
  const [deacons, setDeacons] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>(DEFAULT_STATUS_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deaconFilter, setDeaconFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name')
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({})
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = people
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => {
        if (!deaconFilter) return true
        if (deaconFilter === UNASSIGNED) return !p.deacon
        return p.deacon === deaconFilter
      })

    if (sortMode === 'deacon') {
      return rows.sort((a, b) => {
        const da = a.deacon || '￿' // unassigned sorts last
        const db = b.deacon || '￿'
        const byDeacon = da.localeCompare(db)
        if (byDeacon !== 0) return byDeacon
        return lastNameKey(a.name).localeCompare(lastNameKey(b.name)) || a.name.localeCompare(b.name)
      })
    }
    return rows.sort((a, b) => {
      const byLastName = lastNameKey(a.name).localeCompare(lastNameKey(b.name))
      return byLastName !== 0 ? byLastName : a.name.localeCompare(b.name)
    })
  }, [people, search, deaconFilter, sortMode])

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

  async function submitFollowUp(id: number, note: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/cat/deacons/member/${id}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      return res.ok
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

  if (loading) {
    return <p className="text-gray-500 text-sm px-4 py-8">Loading…</p>
  }

  if (loadError) {
    return (
      <div className="px-4 py-8 max-w-md">
        <p className="text-red-700 text-sm font-medium mb-1">Could not load the roster from Watson.</p>
        <p className="text-gray-500 text-xs mb-4">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="text-sm font-semibold text-blue-700 hover:text-blue-900 border border-blue-700 rounded-lg px-4 py-2"
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
          className="flex-1 bg-white border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
        />
        <select
          value={deaconFilter}
          onChange={(e) => setDeaconFilter(e.target.value)}
          className="bg-white border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
        >
          <option value="">All deacons</option>
          {deacons.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={UNASSIGNED}>Unassigned</option>
        </select>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-white border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
          aria-label="Sort order"
        >
          <option value="name">Sort: Name</option>
          <option value="deacon">Sort: Deacon</option>
        </select>
        <span className="text-xs text-gray-600 self-center whitespace-nowrap font-medium">
          {filtered.length} of {people.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {filtered.map((p) => {
          const isOpen = expandedIds.has(p.id)
          return (
            <div key={p.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900 text-base leading-tight">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.deacon || 'Unassigned'} · Last seen: {formatLastSeen(p.last_seen)}
                  </div>
                  {(p.phone || p.email) && (
                    <div className="flex flex-col gap-0.5 mt-1.5 text-xs">
                      {p.phone && (
                        <a href={telHref(p.phone)} className="text-blue-700 hover:text-blue-900 font-medium">
                          {p.phone}
                        </a>
                      )}
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="text-blue-700 hover:text-blue-900 font-medium break-all">
                          {p.email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs whitespace-nowrap">
                    {saveState[p.id] === 'saving' && <span className="text-gray-500">Saving…</span>}
                    {saveState[p.id] === 'saved' && <span className="text-green-700 font-semibold">Saved ✓</span>}
                    {saveState[p.id] === 'error' && <span className="text-red-700 font-semibold">Failed</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(p.id)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-700 rounded-lg px-3 py-1.5 whitespace-nowrap"
                  >
                    {isOpen ? 'Done' : 'Open'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Deacon</label>
                      <EditableSelect
                        value={p.deacon ?? ''}
                        options={deacons}
                        placeholder="Unassigned"
                        onChange={(v) => updateField(p.id, 'deacon', v)}
                        onAddOption={addDeaconOption}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                      <EditableSelect
                        value={p.deacon_status ?? ''}
                        options={statusOptions}
                        placeholder="—"
                        onChange={(v) => updateField(p.id, 'deacon_status', v)}
                        onAddOption={addStatusOption}
                      />
                    </div>
                  </div>

                  <Field label="Email" value={p.email ?? ''} onCommit={(v) => updateField(p.id, 'email', v)} />
                  <Field label="Phone" value={p.phone ?? ''} onCommit={(v) => updateField(p.id, 'phone', v)} />
                  <Field label="Address" value={p.address ?? ''} onCommit={(v) => updateField(p.id, 'address', v)} />

                  {(() => {
                    const statusLabel = p.member_status ? MEMBER_STATUS_LABELS[p.member_status] : null
                    const risk = attendanceRisk(p.last_seen)
                    const hasPrayers = p.prayer_requests.length > 0
                    const hasSteps = p.next_steps.length > 0
                    if (!statusLabel && !risk && !hasPrayers && !hasSteps) return null
                    return (
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        {(statusLabel || risk) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {statusLabel && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-300">
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
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Prayer Requests</div>
                            <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                              {p.prayer_requests.map((pr, i) => (
                                <li key={i}>
                                  {pr.request_text} <span className="text-gray-400 text-xs">({formatLastSeen(pr.date)})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {hasSteps && (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Next Steps</div>
                            <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                              {p.next_steps.map((ns, i) => (
                                <li key={i}>
                                  {ns.label} <span className="text-gray-400 text-xs">({formatLastSeen(ns.date)})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <FollowUpForm personId={p.id} onSubmit={(note) => submitFollowUp(p.id, note)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
