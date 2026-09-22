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

function isLeader(position: string | null): boolean {
  return (position ?? '').toLowerCase().includes('leader')
}

// Inline edit form for one existing roster row — reuses the same
// /api/cat/servants/add endpoint the "Add Person" flow uses: passing an
// already-known member_id skips that endpoint's name-resolution entirely,
// so it's a plain upsert of position/started_serving_date for this one
// team_memberships row. Leaving the date field blank means "don't change
// it" (same convention the backend already applies for Add).
function EditServantForm({
  member,
  teamName,
  onDone,
  onCancel,
}: {
  member: Servant
  teamName: string
  onDone: () => void
  onCancel: () => void
}) {
  const [position, setPosition] = useState(member.position ?? '')
  const [date, setDate] = useState(member.started_serving_date ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/cat/servants/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: member.name,
        team_name: teamName,
        member_id: member.id,
        position: position.trim() || undefined,
        started_serving_date: date || undefined,
      }),
    })
    if (res.ok) {
      onDone()
      return
    }
    const body = await res.json().catch(() => ({}))
    setSubmitting(false)
    setError(body.error || 'Could not save. Try again.')
  }

  return (
    <li className="py-3 px-3 my-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-black dark:text-white mb-2">Edit {member.name}</p>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Role</label>
      <input
        type="text"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        className="w-full mb-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
      />
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Started serving</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full mb-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
      />
      {error && <p className="text-red-600 dark:text-red-400 text-xs mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </li>
  )
}

function ServantRow({
  member,
  teamName,
  editing,
  onStartEdit,
  onDoneEdit,
  onRemoved,
}: {
  member: Servant
  teamName: string
  editing: boolean
  onStartEdit: () => void
  onDoneEdit: () => void
  onRemoved: () => void
}) {
  const [removing, setRemoving] = useState(false)

  if (editing) {
    return <EditServantForm member={member} teamName={teamName} onDone={onDoneEdit} onCancel={onDoneEdit} />
  }

  const handleRemove = async () => {
    if (!confirm(`Mark ${member.name} as no longer serving on ${teamName}?`)) return
    setRemoving(true)
    const res = await fetch('/api/cat/servants/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: member.id, team_name: teamName }),
    })
    if (res.ok) {
      onRemoved()
      return
    }
    setRemoving(false)
  }

  return (
    <li className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 py-2.5">
      <button
        type="button"
        onClick={onStartEdit}
        title="Tap to edit"
        className={`text-left text-black dark:text-white text-[15px] underline decoration-dotted decoration-gray-400 hover:decoration-solid ${isLeader(member.position) ? 'font-semibold' : ''}`}
      >
        {member.name}
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300">{member.position || '—'}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(member.started_serving_date)}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          title="No longer serving"
          aria-label={`Mark ${member.name} as no longer serving on ${teamName}`}
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded border-2 border-red-600 bg-white dark:bg-gray-950 text-red-600 text-xs font-bold leading-none disabled:opacity-50"
        >
          {removing ? '…' : '✕'}
        </button>
      </div>
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
  addingTeam,
  editingId,
  onStartAdd,
  onDoneAdd,
  onStartEdit,
  onDoneEdit,
}: {
  team: Team
  addingTeam: string | null
  editingId: number | null
  onStartAdd: (team: string) => void
  onDoneAdd: () => void
  onStartEdit: (id: number) => void
  onDoneEdit: () => void
}) {
  const isAdding = addingTeam === team.team_name

  return (
    <section className="mb-6">
      <details open={isAdding}>
        <summary className="text-lg font-semibold text-black dark:text-white mb-2 cursor-pointer select-none">
          {team.team_name}{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({team.members.length})</span>
        </summary>

        {team.members.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-gray-300 dark:border-gray-700 pb-1.5 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <span>Name</span>
            <span>Role</span>
            <span>Started Serving</span>
          </div>
        )}
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800">
          {team.members.map((m) => (
            <ServantRow
              key={m.id}
              member={m}
              teamName={team.team_name}
              editing={editingId === m.id}
              onStartEdit={() => onStartEdit(m.id)}
              onDoneEdit={onDoneEdit}
              onRemoved={onDoneEdit}
            />
          ))}
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
  const [error, setError] = useState<string | null>(null)
  const [addingTeam, setAddingTeam] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

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

  const handleDoneEdit = () => {
    setEditingId(null)
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

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {data.teams.map((team) => (
        <TeamSection
          key={team.team_name}
          team={team}
          addingTeam={addingTeam}
          editingId={editingId}
          onStartAdd={setAddingTeam}
          onDoneAdd={handleDoneAdd}
          onStartEdit={setEditingId}
          onDoneEdit={handleDoneEdit}
        />
      ))}
    </div>
  )
}
