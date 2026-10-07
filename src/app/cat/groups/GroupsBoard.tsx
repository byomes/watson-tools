'use client'

import { useCallback, useEffect, useState } from 'react'

interface SeriesItem { series: string; title: string; counts_only: boolean }
interface Person { id: number; name: string; present: boolean }
interface State {
  series_list: SeriesItem[]
  series?: string
  dates?: string[]
  event_date?: string
  counts_only?: boolean
  roster?: Person[]
  guests?: number
  headcount?: number | null
}

function formatDate(iso: string): string {
  // Parsed as local so the label matches the date (new Date('YYYY-MM-DD') is UTC).
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

const selectCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-[15px] text-black dark:text-white bg-white dark:bg-gray-900 mb-3'

export default function GroupsBoard() {
  const [state, setState] = useState<State | null>(null)
  const [series, setSeries] = useState('')
  const [date, setDate] = useState('')
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<{ id: number; name: string }[] | null>(null)
  const [guests, setGuests] = useState(0)
  const [headcount, setHeadcount] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async (s: string, d: string) => {
    const res = await fetch(`/api/cat/groups/state?series=${encodeURIComponent(s)}&date=${encodeURIComponent(d)}`)
    if (!res.ok) { setError('Could not load. Try again.'); return }
    const data: State = await res.json()
    setError(null)
    setState(data)
    setGuests(data.guests ?? 0)
    setHeadcount(data.headcount != null ? String(data.headcount) : '')
    if (data.event_date) setDate(data.event_date)
  }, [])

  useEffect(() => {
    // Initial series list only; fetched inline so state is set from a callback, not synchronously.
    fetch('/api/cat/groups/state')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: State) => setState(d))
      .catch(() => setError('Could not load. Try again.'))
  }, [])

  function pickSeries(s: string) { setSeries(s); setDate(''); setCandidates(null); setQuery(''); load(s, '') }
  function pickDate(d: string) { setDate(d); load(series, d) }

  async function setPresent(id: number, present: boolean, name?: string) {
    if (!state?.series || !state.event_date) return
    setPending(p => new Set(p).add(id))
    setError(null)
    const res = await fetch('/api/cat/groups/toggle', {
      method: 'POST',
      body: JSON.stringify({ series: state.series, event_date: state.event_date, member_id: id, present }),
    })
    setPending(p => { const n = new Set(p); n.delete(id); return n })
    if (!res.ok) { setError('That did not save. Try again.'); return }
    setState(s => {
      if (!s) return s
      const roster = s.roster ?? []
      const exists = roster.some(r => r.id === id)
      return {
        ...s,
        roster: exists
          ? roster.map(r => (r.id === id ? { ...r, present } : r))
          : [...roster, { id, name: name ?? '', present }].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
  }

  async function removeRegular(id: number) {
    if (!state?.series) return
    setError(null)
    const res = await fetch('/api/cat/groups/remove', {
      method: 'POST',
      body: JSON.stringify({ series: state.series, event_date: state.event_date ?? '', member_id: id }),
    })
    if (!res.ok) { setError('That did not save. Try again.'); return }
    setConfirmRemove(null)
    setState(s => (s ? { ...s, roster: (s.roster ?? []).filter(r => r.id !== id) } : s))
  }

  async function addRegular(id: number, name: string) {
    if (!state?.series) return
    setError(null)
    const res = await fetch('/api/cat/groups/roster_add', {
      method: 'POST',
      body: JSON.stringify({ series: state.series, member_id: id }),
    })
    if (!res.ok) { setError('That did not save. Try again.'); return }
    setState(s => {
      if (!s) return s
      const roster = s.roster ?? []
      return roster.some(r => r.id === id)
        ? s
        : { ...s, roster: [...roster, { id, name, present: false }].sort((a, b) => a.name.localeCompare(b.name)) }
    })
  }

  async function search() {
    const q = query.trim()
    if (!q) return
    const res = await fetch(`/api/cat/groups/lookup?name=${encodeURIComponent(q)}`)
    setCandidates(res.ok ? (await res.json()).candidates : [])
  }

  async function saveCounts() {
    if (!state?.series || !state.event_date) return
    setError(null)
    const body = state.counts_only
      ? { series: state.series, event_date: state.event_date, headcount: Number(headcount) }
      : { series: state.series, event_date: state.event_date, guests }
    const res = await fetch('/api/cat/groups/counts', { method: 'POST', body: JSON.stringify(body) })
    if (!res.ok) { setError('That did not save. Check the number.'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (!state) return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading...'}</p>

  const present = (state.roster ?? []).filter(r => r.present).length
  return (
    <div>
      <select className={selectCls} value={series} onChange={e => pickSeries(e.target.value)}>
        <option value="">Choose a group or event...</option>
        {state.series_list.map(s => <option key={s.series} value={s.series}>{s.title}</option>)}
      </select>

      {state.series && (state.dates ?? []).length === 0 && !state.counts_only && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            This group has not met yet. Build your list of regulars now. When the first session happens, they will all be here with toggles.
          </p>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 mb-3">
            {(state.roster ?? []).map(p => (
              <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-black dark:text-white text-[15px]">{p.name}</span>
                {confirmRemove === p.id ? (
                  <span className="flex items-center gap-2 text-sm">
                    <button type="button" className="text-red-600" onClick={() => removeRegular(p.id)}>Remove</button>
                    <button type="button" className="text-gray-500 dark:text-gray-400" onClick={() => setConfirmRemove(null)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" aria-label={`Remove ${p.name}`} className="text-gray-400 text-lg leading-none"
                    onClick={() => setConfirmRemove(p.id)}>×</button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Start of a name"
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-900" />
            <button type="button" onClick={search} className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 text-white">Find</button>
          </div>
          {candidates && candidates.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No match. Check the spelling, or ask staff to add the person to the church database first.</p>
          )}
          {candidates && candidates.length > 0 && (
            <ul className="mt-2 border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
              {candidates.map(c => (
                <li key={c.id}>
                  <button type="button" className="w-full text-left px-3 py-2 text-black dark:text-white"
                    onClick={() => { addRegular(c.id, c.name); setCandidates(null); setQuery('') }}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.series && (state.dates ?? []).length === 0 && state.counts_only && (
        <p className="text-sm text-gray-500 dark:text-gray-400">This group has not met yet. Come back after its first session to enter the head count.</p>
      )}

      {state.series && state.event_date && (
        <>
          <select className={selectCls} value={date} onChange={e => pickDate(e.target.value)}>
            {(state.dates ?? []).map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
          </select>

          {state.counts_only ? (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">This group records a head count only. No names are kept.</p>
              <label className="block text-sm text-black dark:text-white mb-1">How many were there?</label>
              <input type="number" min={0} max={500} inputMode="numeric" value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                className="w-28 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-900 mr-3" />
              <button type="button" onClick={saveCounts} disabled={headcount === ''}
                className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50">{saved ? 'Saved' : 'Save'}</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Regulars: {present} of {(state.roster ?? []).length} here</p>
              {(state.roster ?? []).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No regulars yet. Add the people who come to this group below, and they will show up here every week.</p>
              )}
              <ul className="divide-y divide-gray-200 dark:divide-gray-800 mb-4">
                {(state.roster ?? []).map(p => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                    <span className="text-black dark:text-white text-[15px]">{p.name}</span>
                    <div className="flex items-center gap-3">
                      {confirmRemove === p.id ? (
                        <span className="flex items-center gap-2 text-sm">
                          <button type="button" className="text-red-600" onClick={() => removeRegular(p.id)}>Remove</button>
                          <button type="button" className="text-gray-500 dark:text-gray-400" onClick={() => setConfirmRemove(null)}>Keep</button>
                        </span>
                      ) : (
                        <button type="button" aria-label={`Remove ${p.name} from regulars`} className="text-gray-400 text-lg leading-none"
                          onClick={() => setConfirmRemove(p.id)}>×</button>
                      )}
                      <Toggle on={p.present} disabled={pending.has(p.id)} onClick={() => setPresent(p.id, !p.present)} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mb-4">
                {!adding && (
                  <button type="button" onClick={() => setAdding(true)} className="text-green-700 font-medium">+ Add a name</button>
                )}
                {adding && <div className="flex gap-2">
                  <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder="Start of a name"
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-900" />
                  <button type="button" onClick={search} className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 text-white">Find</button>
                </div>}
                {candidates && candidates.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No match. Check the spelling, or ask staff to add the person to the church database first.</p>
                )}
                {candidates && candidates.length > 0 && (
                  <ul className="mt-2 border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                    {candidates.map(c => (
                      <li key={c.id}>
                        <button type="button" className="w-full text-left px-3 py-2 text-black dark:text-white"
                          onClick={() => { setPresent(c.id, true, c.name); setCandidates(null); setQuery(''); setAdding(false) }}>
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-black dark:text-white">Guests (not in the church database)</span>
                <input type="number" min={0} max={100} inputMode="numeric" value={guests}
                  onChange={e => setGuests(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-black dark:text-white bg-white dark:bg-gray-900" />
                <button type="button" onClick={saveCounts} className="px-3 py-1 rounded-lg bg-green-600 text-white">{saved ? 'Saved' : 'Save'}</button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
