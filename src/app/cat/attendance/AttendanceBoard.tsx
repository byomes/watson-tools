'use client'

import { useEffect, useMemo, useState } from 'react'

type CampusPreference = 'Wilmington' | 'Online' | 'Hybrid' | 'Inactive'

const CAMPUS_OPTIONS: CampusPreference[] = ['Wilmington', 'Online', 'Hybrid', 'Inactive']

interface Member {
  id: number
  name: string
  present: boolean
  campus_preference: CampusPreference
}

interface StateResponse {
  service_date: string
  recent_sundays: string[]
  wilmington: Member[]
  online: Member[]
  inactive: Member[]
}

function formatSunday(iso: string): string {
  // Parsed as local, not UTC, so the label always matches the date typed —
  // `new Date('2026-08-30')` alone would render as the day before in any
  // timezone west of UTC.
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function CampusRadios({
  member,
  disabled,
  onChange,
}: {
  member: Member
  disabled: boolean
  onChange: (member: Member, value: CampusPreference) => void
}) {
  return (
    <div role="radiogroup" aria-label={`Campus for ${member.name}`} className="shrink-0 flex gap-2.5">
      {CAMPUS_OPTIONS.map((option) => (
        <label key={option} className="flex flex-col items-center gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
          <input
            type="radio"
            name={`campus-${member.id}`}
            checked={member.campus_preference === option}
            disabled={disabled}
            onChange={() => onChange(member, option)}
            className="w-4 h-4"
          />
          {option}
        </label>
      ))}
    </div>
  )
}

function MemberRow({
  member,
  editMode,
  pending,
  attendanceCampus,
  onToggle,
  onCampusChange,
}: {
  member: Member
  editMode: boolean
  pending: boolean
  attendanceCampus: 'Wilmington' | 'Online'
  onToggle: (member: Member, campus: 'Wilmington' | 'Online') => void
  onCampusChange: (member: Member, value: CampusPreference) => void
}) {
  return (
    <li className="flex items-center justify-between py-2.5 gap-3">
      <span className="text-black dark:text-white text-[15px]">{member.name}</span>
      {editMode ? (
        <CampusRadios member={member} disabled={pending} onChange={onCampusChange} />
      ) : (
        <Toggle on={member.present} disabled={pending} onClick={() => onToggle(member, attendanceCampus)} />
      )}
    </li>
  )
}

function CampusSection({
  title,
  campus,
  members,
  filter,
  pending,
  editMode,
  onToggle,
  onCampusChange,
}: {
  title: string
  campus: 'Wilmington' | 'Online'
  members: Member[]
  filter: string
  pending: Set<number>
  editMode: boolean
  onToggle: (member: Member, campus: 'Wilmington' | 'Online') => void
  onCampusChange: (member: Member, value: CampusPreference) => void
}) {
  const visible = members.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
  const presentCount = members.filter((m) => m.present).length

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
        {title}{' '}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          ({presentCount}/{members.length} present)
        </span>
      </h2>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
        {visible.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            editMode={editMode}
            pending={pending.has(m.id)}
            attendanceCampus={campus}
            onToggle={onToggle}
            onCampusChange={onCampusChange}
          />
        ))}
        {visible.length === 0 && (
          <li className="py-3 text-sm text-gray-400 dark:text-gray-500">No matching names.</li>
        )}
      </ul>
    </section>
  )
}

function InactiveSection({
  members,
  filter,
  pending,
  editMode,
  onToggle,
  onCampusChange,
}: {
  members: Member[]
  filter: string
  pending: Set<number>
  editMode: boolean
  onToggle: (member: Member, campus: 'Wilmington' | 'Online') => void
  onCampusChange: (member: Member, value: CampusPreference) => void
}) {
  const visible = members.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <section className="mb-8">
      {/* Collapsed by default (no `open` attr) — kept below Wilmington/Online
          and out of the way so it isn't scrolled past during weekly
          attendance-taking. */}
      <details>
        <summary className="text-lg font-semibold text-black dark:text-white mb-2 cursor-pointer select-none">
          Inactive <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({members.length})</span>
        </summary>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800 mt-2">
          {visible.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              editMode={editMode}
              pending={pending.has(m.id)}
              attendanceCampus={m.campus_preference === 'Online' ? 'Online' : 'Wilmington'}
              onToggle={onToggle}
              onCampusChange={onCampusChange}
            />
          ))}
          {visible.length === 0 && (
            <li className="py-3 text-sm text-gray-400 dark:text-gray-500">No matching names.</li>
          )}
        </ul>
      </details>
    </section>
  )
}

export default function AttendanceBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [filter, setFilter] = useState('')
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  const fetchState = async (date: string) => {
    setError(null)
    const res = await fetch(`/api/cat/attendance/state?date=${encodeURIComponent(date)}`)
    if (!res.ok) {
      setError('Could not load attendance. Try refreshing.')
      return
    }
    const body: StateResponse = await res.json()
    setData(body)
    setSelectedDate(body.service_date)
  }

  useEffect(() => {
    fetchState('')
  }, [])

  const sundayOptions = useMemo(() => data?.recent_sundays ?? [], [data])

  const handleToggle = async (member: Member, campus: 'Wilmington' | 'Online') => {
    if (!data) return
    const nextPresent = !member.present

    setPending((prev) => new Set(prev).add(member.id))
    setError(null)

    const res = await fetch('/api/cat/attendance/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: member.id,
        service_date: data.service_date,
        present: nextPresent,
        campus,
      }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(member.id)
      return next
    })

    if (!res.ok) {
      setError(`Could not update ${member.name}. Try again.`)
      return
    }

    // Refetch rather than patch client state locally — a Hybrid member
    // appears in both campus lists sharing one underlying present flag, and
    // a full refetch keeps both in sync without duplicating that logic here.
    await fetchState(data.service_date)
  }

  const handleCampusChange = async (member: Member, value: CampusPreference) => {
    if (!data || value === member.campus_preference) return

    setPending((prev) => new Set(prev).add(member.id))
    setError(null)

    const res = await fetch('/api/cat/attendance/campus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: member.id, campus_preference: value }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(member.id)
      return next
    })

    if (!res.ok) {
      setError(`Could not update ${member.name}'s campus. Try again.`)
      return
    }

    // Refetch — a campus change can move a member between the Wilmington,
    // Online, and Inactive lists.
    await fetchState(data.service_date)
  }

  if (!data) {
    return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading…'}</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditMode((v) => !v)}
        className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium border ${
          editMode
            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
            : 'bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600'
        }`}
      >
        {editMode ? 'Done Editing Campus' : 'Edit Campus'}
      </button>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service date</label>
      <select
        value={data.service_date}
        onChange={(e) => fetchState(e.target.value)}
        className="w-full mb-4 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800"
      >
        {sundayOptions.map((d) => (
          <option key={d} value={d}>
            {formatSunday(d)}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Filter names…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full mb-6 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      <CampusSection
        title="Wilmington"
        campus="Wilmington"
        members={data.wilmington}
        filter={filter}
        pending={pending}
        editMode={editMode}
        onToggle={handleToggle}
        onCampusChange={handleCampusChange}
      />
      <CampusSection
        title="Online"
        campus="Online"
        members={data.online}
        filter={filter}
        pending={pending}
        editMode={editMode}
        onToggle={handleToggle}
        onCampusChange={handleCampusChange}
      />
      <InactiveSection
        members={data.inactive}
        filter={filter}
        pending={pending}
        editMode={editMode}
        onToggle={handleToggle}
        onCampusChange={handleCampusChange}
      />
    </div>
  )
}
