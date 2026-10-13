'use client'

import { useCallback, useEffect, useState } from 'react'

type Leader = { id: number; name: string; channel: 'telegram' | 'sms' | null }
type Group = {
  title: string
  weekly: boolean
  enabled: boolean
  delay_minutes: number
  message: string
  weekly_start: string
  archived: boolean
  leaders: Leader[]
  next: { date: string; time_text: string; fire: string; deferred: boolean } | null
  needs_start: boolean
  last: { event_date: string; sent_at: string; ok: number; bad: number } | null
}
type Member = { id: number; name: string }
type Draft = { enabled: boolean; delay: string; message: string; weeklyStart: string; leaderIds: number[] }

const CHANNEL: Record<string, string> = { telegram: 'Telegram', sms: 'SMS' }

function toDraft(g: Group): Draft {
  return {
    enabled: g.enabled,
    delay: String(g.delay_minutes),
    message: g.message,
    weeklyStart: g.weekly_start,
    leaderIds: g.leaders.map((l) => l.id),
  }
}

export default function AttSchedBoard() {
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [defaultDelay, setDefaultDelay] = useState(120)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/cat/attsched/state', { cache: 'no-store' })
    if (res.status === 401) {
      window.location.href = '/cat/catalystdb/login?next=/cat/attsched'
      return
    }
    if (!res.ok) {
      setError('Could not load groups.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setGroups(data.groups)
    setMembers(data.members)
    setDefaultDelay(data.default_delay)
    setDrafts(Object.fromEntries((data.groups as Group[]).map((g) => [g.title, toDraft(g)])))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = (title: string, p: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [title]: { ...d[title], ...p } }))

  const save = async (g: Group) => {
    const d = drafts[g.title]
    const res = await fetch('/api/cat/attsched/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: g.title,
        enabled: d.enabled,
        delay_minutes: Number(d.delay),
        message: d.message,
        weekly_start: d.weeklyStart,
        leader_ids: d.leaderIds,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg((m) => ({ ...m, [g.title]: { ok: true, text: 'Saved' } }))
      load()
    } else {
      setMsg((m) => ({ ...m, [g.title]: { ok: false, text: body.error || 'Could not save' } }))
    }
  }

  const setArchived = async (g: Group, archived: boolean) => {
    if (archived && !window.confirm(`Exempt "${g.title}" from attendance tracking and move it to the archive?`)) return
    const res = await fetch('/api/cat/attsched/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: g.title, archived }),
    })
    if (res.ok) load()
    else setMsg((m) => ({ ...m, [g.title]: { ok: false, text: 'Could not update' } }))
  }

  const nameOf =(id: number) => members.find((m) => m.id === id)?.name ?? `#${id}`
  const field =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-bold">Attendance Rules</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          For each group, Watson sends the leaders your message plus that session&apos;s attendance link, the chosen
          number of minutes after the calendar start time (standard {defaultDelay}). Telegram is used first for
          leaders Watson already knows there, SMS for everyone else. Nothing is sent until a group is turned on, and
          nothing goes out before 9am or after 8pm; a send that would land later waits until 9am the next day.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-4 text-sm text-slate-500">Loading...</p>}

        <div className="mt-5 space-y-5">
          {groups.filter((g) => !g.archived).map((g) => {
            const d = drafts[g.title]
            if (!d) return null
            const available = members.filter((m) => !d.leaderIds.includes(m.id))
            const m = msg[g.title]
            return (
              <section key={g.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{g.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {g.next
                        ? `Next: ${g.next.date} (${g.next.time_text}) -> sends ${g.next.fire}${g.next.deferred ? ' (held until 9am)' : ''}`
                        : g.needs_start
                          ? 'Not on the calendar. Set a weekly start time below.'
                          : 'No upcoming session on the calendar.'}
                    </p>
                    {g.last && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Last send: {g.last.event_date} ({g.last.ok} sent{g.last.bad ? `, ${g.last.bad} problem` : ''})
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm shrink-0">
                    <input type="checkbox" checked={d.enabled} onChange={(e) => patch(g.title, { enabled: e.target.checked })} />
                    On
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Leaders</div>
                  <div className="flex flex-wrap gap-2">
                    {d.leaderIds.map((id) => {
                      const known = g.leaders.find((l) => l.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm">
                          {nameOf(id)}
                          {known && <span className="text-xs text-slate-500">({known.channel ? CHANNEL[known.channel] : 'no way to reach'})</span>}
                          <button
                            type="button"
                            aria-label={`Remove ${nameOf(id)}`}
                            className="ml-1 text-slate-500 hover:text-red-600"
                            onClick={() => patch(g.title, { leaderIds: d.leaderIds.filter((x) => x !== id) })}
                          >
                            x
                          </button>
                        </span>
                      )
                    })}
                    {d.leaderIds.length === 0 && <span className="text-sm text-slate-500">None assigned</span>}
                  </div>
                  <select
                    className={`${field} mt-2`}
                    value=""
                    onChange={(e) => e.target.value && patch(g.title, { leaderIds: [...d.leaderIds, Number(e.target.value)] })}
                  >
                    <option value="">Add a leader...</option>
                    {available.map((mm) => (
                      <option key={mm.id} value={mm.id}>
                        {mm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium">
                    Minutes after start
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      className={`${field} mt-1`}
                      value={d.delay}
                      onChange={(e) => patch(g.title, { delay: e.target.value })}
                    />
                  </label>
                  {(g.weekly || g.needs_start) && (
                    <label className="text-xs font-medium">
                      Weekly start time (Sundays)
                      <input
                        type="time"
                        className={`${field} mt-1`}
                        value={d.weeklyStart}
                        onChange={(e) => patch(g.title, { weeklyStart: e.target.value })}
                      />
                    </label>
                  )}
                </div>

                <label className="mt-3 block text-xs font-medium">
                  Message (the link is added after it, or put {'{link}'} where it should go)
                  <textarea
                    rows={3}
                    maxLength={600}
                    className={`${field} mt-1`}
                    value={d.message}
                    onChange={(e) => patch(g.title, { message: e.target.value })}
                    placeholder="Write the text the leaders will receive"
                  />
                </label>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => save(g)}
                    className="rounded-lg bg-slate-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchived(g, true)}
                    className="ml-auto rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Exempt / Archive
                  </button>
                  {m && <span className={`text-sm ${m.ok ? 'text-green-600' : 'text-red-600'}`}>{m.text}</span>}
                </div>
              </section>
            )
          })}
        </div>

        {groups.some((g) => g.archived) && (
          <details className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Archived ({groups.filter((g) => g.archived).length}) - exempt from attendance tracking
            </summary>
            <ul className="mt-3 space-y-2">
              {groups
                .filter((g) => g.archived)
                .map((g) => (
                  <li key={g.title} className="flex items-center justify-between gap-3 text-sm">
                    <span>{g.title}</span>
                    <button
                      type="button"
                      onClick={() => setArchived(g, false)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5"
                    >
                      Restore
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}
