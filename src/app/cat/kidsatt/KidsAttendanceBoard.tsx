'use client'

import { useEffect, useMemo, useState } from 'react'

interface Kid {
  id: number
  name: string
  present: boolean
}

interface ClassGroup {
  class_name: string
  present_count: number
  kids: Kid[]
}

interface StateResponse {
  service_date: string
  recent_sundays: string[]
  class_names: string[]
  classes: ClassGroup[]
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

function KidRow({
  kid,
  currentClass,
  classNames,
  pending,
  onToggle,
  onMove,
  onRemove,
}: {
  kid: Kid
  currentClass: string
  classNames: string[]
  pending: boolean
  onToggle: (kid: Kid) => void
  onMove: (kid: Kid, className: string) => void
  onRemove: (kid: Kid) => void
}) {
  return (
    <li className="flex items-center justify-between py-2.5 gap-3">
      <span className="text-black dark:text-white text-[15px]">{kid.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        {kid.present && (
          <select
            value={currentClass}
            disabled={pending}
            onChange={(e) => onMove(kid, e.target.value)}
            aria-label={`Move ${kid.name} to a different class`}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-1.5 py-1 text-black dark:text-white bg-white dark:bg-gray-800 disabled:opacity-50"
          >
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <Toggle on={kid.present} disabled={pending} onClick={() => onToggle(kid)} />
        <button
          type="button"
          disabled={pending}
          onClick={() => onRemove(kid)}
          aria-label={`Remove ${kid.name} from this class`}
          title="Remove from this class"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

function ClassSection({
  group,
  classNames,
  filter,
  pending,
  onToggle,
  onMove,
  onRemove,
}: {
  group: ClassGroup
  classNames: string[]
  filter: string
  pending: Set<number>
  onToggle: (kid: Kid) => void
  onMove: (kid: Kid, className: string) => void
  onRemove: (kid: Kid) => void
}) {
  const visible = group.kids.filter((k) => k.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <section className="mb-4">
      <details>
        <summary className="text-lg font-semibold text-black dark:text-white mb-2 cursor-pointer select-none">
          {group.class_name}{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({group.present_count}/{group.kids.length} present)
          </span>
        </summary>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800 mt-2">
          {visible.map((k) => (
            <KidRow
              key={k.id}
              kid={k}
              currentClass={group.class_name}
              classNames={classNames}
              pending={pending.has(k.id)}
              onToggle={onToggle}
              onMove={onMove}
              onRemove={onRemove}
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

export default function KidsAttendanceBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [filter, setFilter] = useState('')
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchState = async (date: string) => {
    setError(null)
    const res = await fetch(`/api/cat/kidsatt/state?date=${encodeURIComponent(date)}`)
    if (!res.ok) {
      setError('Could not load kids attendance. Try refreshing.')
      return
    }
    const body: StateResponse = await res.json()
    setData(body)
  }

  useEffect(() => {
    fetchState('')
  }, [])

  const sundayOptions = useMemo(() => data?.recent_sundays ?? [], [data])

  const handleToggle = async (kid: Kid) => {
    if (!data) return
    const nextPresent = !kid.present
    // Whatever class this kid is currently showing under (their actual
    // checkin for this date, or their most-recent class if they aren't
    // marked present yet) is where marking them present adds them.
    const group = data.classes.find((g) => g.kids.some((k) => k.id === kid.id))
    const className = group?.class_name ?? data.class_names[0]

    setPending((prev) => new Set(prev).add(kid.id))
    setError(null)

    const res = await fetch('/api/cat/kidsatt/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kid.id,
        service_date: data.service_date,
        present: nextPresent,
        class_name: className,
      }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(kid.id)
      return next
    })

    if (!res.ok) {
      setError(`Could not update ${kid.name}. Try again.`)
      return
    }

    await fetchState(data.service_date)
  }

  const handleMove = async (kid: Kid, className: string) => {
    if (!data) return

    setPending((prev) => new Set(prev).add(kid.id))
    setError(null)

    const res = await fetch('/api/cat/kidsatt/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_id: kid.id, service_date: data.service_date, class_name: className }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(kid.id)
      return next
    })

    if (!res.ok) {
      setError(`Could not move ${kid.name}. Try again.`)
      return
    }

    // Refetch — a class move changes which section a kid appears under.
    await fetchState(data.service_date)
  }

  const handleRemove = async (kid: Kid) => {
    if (!data) return
    if (!window.confirm(`Remove ${kid.name} from this class? They won't show up in Kids Attendance again until they check in or are moved back in.`)) {
      return
    }

    setPending((prev) => new Set(prev).add(kid.id))
    setError(null)

    const res = await fetch('/api/cat/kidsatt/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_id: kid.id, service_date: data.service_date }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(kid.id)
      return next
    })

    if (!res.ok) {
      setError(`Could not remove ${kid.name}. Try again.`)
      return
    }

    await fetchState(data.service_date)
  }

  if (!data) {
    return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading…'}</p>
  }

  return (
    <div>
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

      {data.classes.map((group) => (
        <ClassSection
          key={group.class_name}
          group={group}
          classNames={data.class_names}
          filter={filter}
          pending={pending}
          onToggle={handleToggle}
          onMove={handleMove}
          onRemove={handleRemove}
        />
      ))}
    </div>
  )
}
