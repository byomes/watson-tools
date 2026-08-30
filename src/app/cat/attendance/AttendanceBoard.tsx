'use client'

import { useEffect, useMemo, useState } from 'react'

interface Member {
  id: number
  name: string
  present: boolean
}

interface StateResponse {
  service_date: string
  recent_sundays: string[]
  wilmington: Member[]
  online: Member[]
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
        on ? 'bg-green-600' : 'bg-gray-300'
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

function CampusSection({
  title,
  campus,
  members,
  filter,
  pending,
  onToggle,
}: {
  title: string
  campus: 'Wilmington' | 'Online'
  members: Member[]
  filter: string
  pending: Set<number>
  onToggle: (member: Member, campus: 'Wilmington' | 'Online') => void
}) {
  const visible = members.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
  const presentCount = members.filter((m) => m.present).length

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-black mb-2">
        {title}{' '}
        <span className="text-sm font-normal text-gray-500">
          ({presentCount}/{members.length} present)
        </span>
      </h2>
      <ul className="divide-y divide-gray-200 border-y border-gray-200">
        {visible.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2.5">
            <span className="text-black text-[15px]">{m.name}</span>
            <Toggle
              on={m.present}
              disabled={pending.has(m.id)}
              onClick={() => onToggle(m, campus)}
            />
          </li>
        ))}
        {visible.length === 0 && (
          <li className="py-3 text-sm text-gray-400">No matching names.</li>
        )}
      </ul>
    </section>
  )
}

export default function AttendanceBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [filter, setFilter] = useState('')
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

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

  if (!data) {
    return <p className="text-gray-500">{error ?? 'Loading…'}</p>
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Service date</label>
      <select
        value={data.service_date}
        onChange={(e) => fetchState(e.target.value)}
        className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-black bg-white"
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
        className="w-full mb-6 border border-gray-300 rounded-lg px-3 py-2 text-black placeholder-gray-400"
      />

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <CampusSection
        title="Wilmington"
        campus="Wilmington"
        members={data.wilmington}
        filter={filter}
        pending={pending}
        onToggle={handleToggle}
      />
      <CampusSection
        title="Online"
        campus="Online"
        members={data.online}
        filter={filter}
        pending={pending}
        onToggle={handleToggle}
      />
    </div>
  )
}
