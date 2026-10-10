'use client'

import { useEffect, useState } from 'react'

interface Servant {
  id: number
  name: string
  position: string | null
  served: boolean
  // Rostered for this Sunday in the church's volunteer schedule. Only means "was scheduled"; whether they served is the toggle.
  scheduled?: boolean
  scheduled_role?: string | null
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

interface Candidate {
  id: number
  name: string
  started_serving_date: string | null
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
        {member.scheduled && (
          <span
            title={member.scheduled_role ? `Scheduled: ${member.scheduled_role}` : 'Scheduled'}
            className="text-xs rounded-full px-2 py-0.5 ml-2 align-middle bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
          >
            Scheduled
          </span>
        )}
        {member.position && (
          <span className="block text-xs text-gray-500 dark:text-gray-400">{member.position}</span>
        )}
      </div>
      <Toggle on={member.served} disabled={pending} onClick={onToggle} />
    </li>
  )
}

// Mirrors ServantsBoard.tsx's AddPersonForm -- same /api/cat/servants/add
// endpoint and name-resolution flow (exact match -> ambiguous candidates ->
// not-found -> create new), duplicated here rather than shared since this
// codebase's frontend follows the same self-contained-page convention its
// Flask blueprints already use. Lets a leader add a missing team member
// right from the Sunday check-off screen instead of switching to
// wtsn.me/cat/servants.
type AddFormState = {
  name: string
  position: string
  startedServingDate: string
  candidates: Candidate[] | null
  notFound: boolean
  submitting: boolean
  error: string | null
}

const EMPTY_FORM: AddFormState = {
  name: '',
  position: '',
  startedServingDate: '',
  candidates: null,
  notFound: false,
  submitting: false,
  error: null,
}

function AddPersonForm({
  teamName,
  onDone,
  onCancel,
}: {
  teamName: string
  onDone: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM)

  const submit = async (opts?: { memberId?: number; createNew?: boolean }) => {
    if (!form.name.trim()) return
    setForm((f) => ({ ...f, submitting: true, error: null }))

    const res = await fetch('/api/cat/servants/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        team_name: teamName,
        position: form.position.trim() || undefined,
        started_serving_date: form.startedServingDate || undefined,
        member_id: opts?.memberId,
        create_new: opts?.createNew ?? false,
      }),
    })
    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      onDone()
      return
    }
    if (res.status === 409 && body.resolution === 'ambiguous') {
      setForm((f) => ({ ...f, submitting: false, candidates: body.candidates, notFound: false }))
      return
    }
    if (res.status === 409 && body.resolution === 'not_found') {
      setForm((f) => ({ ...f, submitting: false, notFound: true, candidates: null }))
      return
    }
    setForm((f) => ({ ...f, submitting: false, error: body.error || 'Something went wrong.' }))
  }

  return (
    <li className="py-3 px-3 my-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-black dark:text-white mb-2">Add someone to {teamName}</p>
      <input
        type="text"
        placeholder="Full name"
        value={form.name}
        onChange={(e) =>
          setForm({ ...EMPTY_FORM, name: e.target.value, position: form.position, startedServingDate: form.startedServingDate })
        }
        className="w-full mb-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
      />
      <input
        type="text"
        placeholder="Role (optional, e.g. Vocalist)"
        value={form.position}
        onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
        className="w-full mb-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
      />
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Serving start date (optional)</label>
      <input
        type="date"
        value={form.startedServingDate}
        onChange={(e) => setForm((f) => ({ ...f, startedServingDate: e.target.value }))}
        className="w-full mb-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
      />

      {form.error && <p className="text-red-600 dark:text-red-400 text-xs mb-2">{form.error}</p>}

      {form.candidates && form.candidates.length > 0 && (
        <div className="mb-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300 mb-1.5">
            Found {form.candidates.length > 1 ? 'more than one' : 'a'} possible match — is this them?
          </p>
          <div className="flex flex-col gap-1.5">
            {form.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => submit({ memberId: c.id })}
                className="text-left px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white text-sm hover:border-black dark:hover:border-white"
              >
                {c.name}{' '}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({c.started_serving_date ? `serving since ${formatDate(c.started_serving_date)}` : 'no serving date on file'})
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => submit({ createNew: true })}
            className="mt-2 text-xs text-gray-500 dark:text-gray-400 underline"
          >
            None of these — add &quot;{form.name}&quot; as a new person
          </button>
        </div>
      )}

      {form.notFound && (
        <div className="mb-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            No one matching &quot;{form.name}&quot; found in the database.
          </p>
          <button
            type="button"
            onClick={() => submit({ createNew: true })}
            disabled={form.submitting}
            className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
          >
            Add &quot;{form.name}&quot; as a new person
          </button>
        </div>
      )}

      {!form.candidates && !form.notFound && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit()}
            disabled={form.submitting || !form.name.trim()}
            className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
          >
            {form.submitting ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return 'no date on file'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function TeamSection({
  team,
  pending,
  onToggle,
  isAdding,
  onStartAdd,
  onDoneAdd,
}: {
  team: Team
  pending: Set<number>
  onToggle: (memberId: number, nextServed: boolean) => void
  isAdding: boolean
  onStartAdd: () => void
  onDoneAdd: () => void
}) {
  const servedCount = team.members.filter((m) => m.served).length

  return (
    <section className="mb-6">
      <details open={isAdding}>
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
          {isAdding && <AddPersonForm teamName={team.team_name} onDone={onDoneAdd} onCancel={onDoneAdd} />}
        </ul>
        {!isAdding && (
          <button
            type="button"
            onClick={onStartAdd}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            + Add Person
          </button>
        )}
      </details>
    </section>
  )
}

export default function ServingBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [addingTeam, setAddingTeam] = useState<string | null>(null)

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
          isAdding={addingTeam === team.team_name}
          onStartAdd={() => setAddingTeam(team.team_name)}
          onDoneAdd={() => {
            setAddingTeam(null)
            fetchState(data.service_date)
          }}
        />
      ))}
    </div>
  )
}
