'use client'

import { useEffect, useMemo, useState } from 'react'

interface Servant {
  id: number
  name: string
  position: string | null
  started_serving_date: string | null
}

interface Team {
  team_name: string
  members: Servant[]
}

interface StateResponse {
  teams: Team[]
}

interface Candidate {
  id: number
  name: string
  started_serving_date: string | null
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

function ServantRow({ member }: { member: Servant }) {
  return (
    <li className="flex items-center justify-between py-2.5 gap-3">
      <div>
        <span className="text-black dark:text-white text-[15px]">{member.name}</span>
        {member.position && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{member.position}</span>
        )}
      </div>
      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
        {formatDate(member.started_serving_date)}
      </span>
    </li>
  )
}

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

function TeamSection({
  team,
  filter,
  addingTeam,
  onStartAdd,
  onDoneAdd,
}: {
  team: Team
  filter: string
  addingTeam: string | null
  onStartAdd: (team: string) => void
  onDoneAdd: () => void
}) {
  const visible = team.members.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
  const isAdding = addingTeam === team.team_name

  return (
    <section className="mb-6">
      <details open={filter.length > 0 || isAdding}>
        <summary className="text-lg font-semibold text-black dark:text-white mb-2 cursor-pointer select-none">
          {team.team_name}{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({team.members.length})</span>
        </summary>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800 mt-2">
          {visible.map((m) => (
            <ServantRow key={m.id} member={m} />
          ))}
          {visible.length === 0 && filter && (
            <li className="py-3 text-sm text-gray-400 dark:text-gray-500">No matching names.</li>
          )}
          {isAdding && <AddPersonForm teamName={team.team_name} onDone={onDoneAdd} onCancel={onDoneAdd} />}
        </ul>
        {!isAdding && (
          <button
            type="button"
            onClick={() => onStartAdd(team.team_name)}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            + Add Person
          </button>
        )}
      </details>
    </section>
  )
}

export default function ServantsBoard() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [addingTeam, setAddingTeam] = useState<string | null>(null)

  const fetchState = async () => {
    setError(null)
    const res = await fetch('/api/cat/servants/state')
    if (!res.ok) {
      setError('Could not load servant teams. Try refreshing.')
      return
    }
    setData(await res.json())
  }

  useEffect(() => {
    fetchState()
  }, [])

  const totalPeople = useMemo(() => {
    if (!data) return 0
    return new Set(data.teams.flatMap((t) => t.members.map((m) => m.id))).size
  }, [data])

  const handleDoneAdd = () => {
    setAddingTeam(null)
    fetchState()
  }

  if (!data) {
    return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading…'}</p>
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {totalPeople} people across {data.teams.length} teams.
      </p>

      <input
        type="text"
        placeholder="Filter names…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full mb-6 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {data.teams.map((team) => (
        <TeamSection
          key={team.team_name}
          team={team}
          filter={filter}
          addingTeam={addingTeam}
          onStartAdd={setAddingTeam}
          onDoneAdd={handleDoneAdd}
        />
      ))}
    </div>
  )
}
