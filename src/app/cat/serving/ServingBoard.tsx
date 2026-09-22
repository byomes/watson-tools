'use client'

import { useEffect, useState } from 'react'

interface Servant {
  id: number
  name: string
  position: string | null
  served: boolean
}

interface Team {
  team_name: string
  members: Servant[]
}

interface StateResponse {
  service_date: string
  recent_sundays: string[]
  teams: Team[]
}

function isLeader(position: string | null): boolean {
  return (position ?? '').toLowerCase().includes('leader')
}

function formatSunday(iso: string): string {
  // Parsed as local, not UTC, so the label always matches the date typed --
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

function ServantRow({
  member,
  pending,
  onToggle,
}: {
  member: Servant
  pending: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex items-center justify-between py-2.5 gap-3">
      <div>
        <span className={`text-black dark:text-white text-[15px] ${isLeader(member.position) ? 'font-semibold' : ''}`}>
          {member.name}
        </span>
        {member.position && (
          <span className="block text-xs text-gray-500 dark:text-gray-400">{member.position}</span>
        )}
      </div>
      <Toggle on={member.served} disabled={pending} onClick={onToggle} />
    </li>
  )
}

function TeamSection({
  team,
  pending,
  onToggle,
}: {
  team: Team
  pending: Set<number>
  onToggle: (memberId: number, nextServed: boolean) => void
}) {
  const servedCount = team.members.filter((m) => m.served).length

  return (
    <section className="mb-6">
      <details>
        <summary className="text-lg font-semibold text-black dark:text-white mb-2 cursor-pointer select-none">
          {team.team_name}{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({servedCount}/{team.members.length} served)
          </span>
        </summary>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800 mt-2">
          {team.members.map((m) => (
            <ServantRow
              key={m.id}
              member={m}
              pending={pending.has(m.id)}
              onToggle={() => onToggle(m.id, !m.served)}
            />
          ))}
          {team.members.length === 0 && (
            <li className="py-3 text-sm text-gray-400 dark:text-gray-500">No one on this team yet.</li>
          )}
        </ul>
      </details>
    </section>
  )
}

export default function ServingBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchState = async (date: string) => {
    setError(null)
    const res = await fetch(`/api/cat/serving/state?date=${encodeURIComponent(date)}`)
    if (!res.ok) {
      setError('Could not load serving attendance. Try refreshing.')
      return
    }
    setData(await res.json())
  }

  useEffect(() => {
    fetchState('')
  }, [])

  const handleToggle = async (teamName: string, memberId: number, nextServed: boolean) => {
    if (!data) return
    setPending((prev) => new Set(prev).add(memberId))
    setError(null)

    const res = await fetch('/api/cat/serving/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        team_name: teamName,
        service_date: data.service_date,
        served: nextServed,
      }),
    })

    setPending((prev) => {
      const next = new Set(prev)
      next.delete(memberId)
      return next
    })

    if (!res.ok) {
      setError('Could not save. Try again.')
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
        className="w-full mb-6 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800"
      >
        {data.recent_sundays.map((d) => (
          <option key={d} value={d}>
            {formatSunday(d)}
          </option>
        ))}
      </select>

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {data.teams.map((team) => (
        <TeamSection
          key={team.team_name}
          team={team}
          pending={pending}
          onToggle={(memberId, nextServed) => handleToggle(team.team_name, memberId, nextServed)}
        />
      ))}
    </div>
  )
}
