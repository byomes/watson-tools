'use client'

import { useEffect, useState } from 'react'
import { COLUMNS } from './columns'

type Member = Record<string, string | number | null>

interface TeamMembership {
  team_name: string
  position: string | null
  started_serving_date: string | null
}

interface ServantsState {
  teams: { team_name: string; members: { id: number; position: string | null }[] }[]
}

// Team membership is many-to-many (a person can serve on several teams),
// so it can't be a single COLUMNS field -- reuses the same
// /api/cat/servants/{state,add,remove} endpoints that already back
// wtsn.me/cat/servants (see jobs/congregation/servants_web.py), just
// scoped to one member_id instead of rendering the whole roster.
function TeamsSection({ member }: { member: Member }) {
  const memberId = member.id as number
  const [allTeams, setAllTeams] = useState<string[]>([])
  const [teams, setTeams] = useState<TeamMembership[] | null>(null)
  const [error, setError] = useState('')
  const [addTeam, setAddTeam] = useState('')
  const [customTeam, setCustomTeam] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/cat/servants/state')
      if (!res.ok) throw new Error('Failed to load teams')
      const data: ServantsState = await res.json()
      setAllTeams(data.teams.map((t) => t.team_name).sort())
      setTeams(
        data.teams
          .filter((t) => t.members.some((m) => m.id === memberId))
          .map((t) => ({
            team_name: t.team_name,
            position: t.members.find((m) => m.id === memberId)?.position ?? null,
            started_serving_date: null,
          }))
      )
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  async function addToTeam() {
    const teamName = (addTeam === '__custom__' ? customTeam : addTeam).trim()
    if (!teamName) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/cat/servants/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(member.name ?? ''),
          member_id: memberId,
          team_name: teamName,
          position: addPosition.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not add to team')
      setAddTeam('')
      setCustomTeam('')
      setAddPosition('')
      await load()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function removeFromTeam(teamName: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/cat/servants/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, team_name: teamName }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not remove from team')
      await load()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  const joinable = allTeams.filter((t) => !teams?.some((tm) => tm.team_name === t))

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Serving Teams</h2>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {teams === null ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">Not on any team yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {teams.map((t) => (
            <li
              key={t.team_name}
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <span className="text-sm text-slate-900 dark:text-white">
                {t.team_name}
                {t.position && <span className="text-slate-500 dark:text-slate-400"> — {t.position}</span>}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeFromTeam(t.team_name)}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:opacity-80 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Add to team</label>
          <select
            value={addTeam}
            onChange={(e) => setAddTeam(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
          >
            <option value="">Select a team…</option>
            {joinable.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__custom__">New team…</option>
          </select>
        </div>
        {addTeam === '__custom__' && (
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">New team name</label>
            <input
              type="text"
              value={customTeam}
              onChange={(e) => setCustomTeam(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Role (optional)</label>
          <input
            type="text"
            value={addPosition}
            onChange={(e) => setAddPosition(e.target.value)}
            placeholder="e.g. Leader"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={addToTeam}
          disabled={busy || !addTeam || (addTeam === '__custom__' && !customTeam.trim())}
          className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default function MemberDetail({
  member,
  onClose,
  onSave,
  onDeactivate,
  onDelete,
}: {
  member: Member
  onClose: () => void
  onSave: (changes: Record<string, string | number>) => Promise<void>
  onDeactivate: () => void
  onDelete: () => void
}) {
  const isDeactivated = member.active === 'disconnected' || member.active === 'deceased'
  const [draft, setDraft] = useState<Member>(member)
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string | number) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const dirty = COLUMNS.some((c) => String(draft[c.key] ?? '') !== String(member[c.key] ?? ''))

  async function handleSave() {
    const changes: Record<string, string | number> = {}
    for (const c of COLUMNS) {
      if (c.readOnly) continue
      const before = String(member[c.key] ?? '')
      const after = String(draft[c.key] ?? '')
      if (before !== after) changes[c.key] = draft[c.key] as string | number
    }
    if (Object.keys(changes).length === 0) return onClose()
    setSaving(true)
    try {
      await onSave(changes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex items-center gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          ← Back to list
        </button>
        <h1 className="text-base font-semibold text-slate-900 dark:text-white flex-1 truncate">{String(member.name ?? '')}</h1>
        {isDeactivated && (
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            Delete Permanently
          </button>
        )}
        <button
          onClick={onDeactivate}
          className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
        >
          Deactivate
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Done'}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLUMNS.map((c) => {
            const value = draft[c.key]
            if (c.readOnly) {
              return (
                <div key={c.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</span>
                  <span className="text-sm text-slate-400 dark:text-slate-500 py-1.5">{value ?? '—'}</span>
                </div>
              )
            }
            return (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</label>
                {c.type === 'bool' ? (
                  <button
                    type="button"
                    onClick={() => set(c.key, value ? 0 : 1)}
                    className={`self-start inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                        value ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : c.type === 'select' ? (
                  <select
                    value={String(value ?? '')}
                    onChange={(e) => set(c.key, e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">—</option>
                    {c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.type === 'date' ? 'date' : 'text'}
                    value={String(value ?? '')}
                    onChange={(e) => set(c.key, e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                  />
                )}
              </div>
            )
          })}
        </div>
        <TeamsSection member={member} />
      </div>
    </div>
  )
}
