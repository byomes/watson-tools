'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SeriesItem {
  series: string
  title: string
  counts_only: boolean
  sunday?: boolean
  latest_date?: string | null
  latest_status?: string
}
interface Person { id: number; name: string; present: boolean; registered?: boolean; regular?: boolean }
interface State {
  series_list: SeriesItem[]
  series?: string
  dates?: string[]
  event_date?: string
  counts_only?: boolean
  roster?: Person[]
  registration_known?: boolean
  guests?: number
  headcount?: number | null
  men?: number | null
  women?: number | null
  did_not_meet?: boolean
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

// One group's attendance: its date picker, regulars with toggles, guests and Save. Used inside each group's section on the
// Groups tab, and on its own for a leader's per-group link (groupToken).
function GroupPanel({ series: fixedSeries, groupToken }: { series?: string; groupToken?: string }) {
  // With a per-group link every request carries the token; the backend then refuses any other group.
  const gfetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: { ...(init?.headers as Record<string, string> | undefined), ...(groupToken ? { 'X-Group-Token': groupToken } : {}) },
      }),
    [groupToken],
  )
  const [state, setState] = useState<State | null>(null)
  const [series, setSeries] = useState('')
  const [date, setDate] = useState('')
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<{ id: number; name: string }[] | null>(null)
  const [guests, setGuests] = useState(0)
  const [men, setMen] = useState('')
  const [women, setWomen] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async (s: string, d: string) => {
    const res = await gfetch(`/api/cat/groups/state?series=${encodeURIComponent(s)}&date=${encodeURIComponent(d)}`)
    if (!res.ok) { setError('Could not load. Try again.'); return }
    const data: State = await res.json()
    setError(null)
    setState(data)
    if (data.series) setSeries(data.series)
    setGuests(data.guests ?? 0)
    setMen(data.men != null ? String(data.men) : '')
    setWomen(data.women != null ? String(data.women) : '')
    if (data.event_date) setDate(data.event_date)
  }, [gfetch])

  useEffect(() => {
    // Opening a group (or a leader link, where the backend picks the group) loads its newest session. Fetched inline so
    // state is set from a callback, not synchronously.
    gfetch(`/api/cat/groups/state?series=${encodeURIComponent(fixedSeries ?? '')}&date=`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: State) => {
        setState(data)
        if (data.series) setSeries(data.series)
        setGuests(data.guests ?? 0)
        setMen(data.men != null ? String(data.men) : '')
        setWomen(data.women != null ? String(data.women) : '')
        if (data.event_date) setDate(data.event_date)
      })
      .catch(() => setError('Could not load. Try again.'))
  }, [gfetch, fixedSeries])

  function pickDate(d: string) { setDate(d); load(series, d) }

  async function setPresent(id: number, present: boolean, name?: string) {
    if (!state?.series || !state.event_date) return
    setPending(p => new Set(p).add(id))
    setError(null)
    const res = await gfetch('/api/cat/groups/toggle', {
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
        did_not_meet: present ? false : s.did_not_meet,
        roster: exists
          ? roster.map(r => (r.id === id ? { ...r, present } : r))
          : [...roster, { id, name: name ?? '', present }].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
  }

  async function removeRegular(id: number) {
    if (!state?.series) return
    setError(null)
    const res = await gfetch('/api/cat/groups/remove', {
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
    const res = await gfetch('/api/cat/groups/roster_add', {
      method: 'POST',
      body: JSON.stringify({ series: state.series, member_id: id }),
    })
    if (!res.ok) { setError('That did not save. Try again.'); return }
    setState(s => {
      if (!s) return s
      const roster = s.roster ?? []
      return roster.some(r => r.id === id)
        ? { ...s, roster: roster.map(r => (r.id === id ? { ...r, regular: true } : r)) }
        : { ...s, roster: [...roster, { id, name, present: false }].sort((a, b) => a.name.localeCompare(b.name)) }
    })
  }

  // Live search: look up matching members as the name is typed (no Find tap needed).
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeq = useRef(0)
  function typeQuery(v: string) {
    setQuery(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = v.trim()
    const mine = ++searchSeq.current
    if (q.length < 2) { setCandidates(null); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await gfetch(`/api/cat/groups/lookup?name=${encodeURIComponent(q)}`)
        const found = res.ok ? (await res.json()).candidates : []
        if (mine === searchSeq.current) setCandidates(found)
      } catch {}
    }, 250)
  }

  async function search() {
    const q = query.trim()
    if (!q) return
    const res = await gfetch(`/api/cat/groups/lookup?name=${encodeURIComponent(q)}`)
    setCandidates(res.ok ? (await res.json()).candidates : [])
  }

  async function saveCounts() {
    if (!state?.series || !state.event_date) return
    setError(null)
    const body = state.counts_only
      ? { series: state.series, event_date: state.event_date, men: Number(men), women: Number(women) }
      : { series: state.series, event_date: state.event_date, guests }
    const res = await gfetch('/api/cat/groups/counts', { method: 'POST', body: JSON.stringify(body) })
    if (!res.ok) { setError('That did not save. Check the number.'); return }
    if (('men' in body ? (body.men ?? 0) + (body.women ?? 0) : 0) > 0 || ('guests' in body ? (body.guests ?? 0) : 0) > 0) setState(s => (s ? { ...s, did_not_meet: false } : s))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // "Did not meet": records that the session was not held, so a missing record is not read as a forgotten one.
  async function setDidNotMeet(flag: boolean) {
    if (!state?.series || !state.event_date) return
    setError(null)
    const res = await gfetch('/api/cat/groups/did_not_meet', {
      method: 'POST',
      body: JSON.stringify({ series: state.series, event_date: state.event_date, did_not_meet: flag }),
    })
    if (res.status === 409) { setError('Attendance is already recorded for this date. Clear it first if the group did not meet.'); return }
    if (!res.ok) { setError('That did not save. Try again.'); return }
    setState(s => (s ? { ...s, did_not_meet: flag } : s))
  }

  if (!state) return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading...'}</p>

  const present = (state.roster ?? []).filter(r => r.present).length
  // Signed up (Subsplash) and actually came are tracked separately. Only meaningful when the
  // session has a sign-up form; otherwise every pill and count below stays hidden.
  const known = !!state.registration_known
  // Sign-up sessions: the registered list leads, regulars and walk-ins follow. Other groups: regulars only, all unchecked.
  const roster = known
    ? [...(state.roster ?? [])].sort((a, b) => Number(!!b.registered) - Number(!!a.registered) || a.name.localeCompare(b.name))
    : (state.roster ?? [])
  const registeredCount = roster.filter(r => r.registered).length
  const noShows = roster.filter(r => r.registered && !r.present)
  const walkIns = roster.filter(r => r.present && !r.registered)
  const pill = (p: Person) => {
    if (!known) return null
    const base = 'text-xs rounded-full px-2 py-0.5 ml-2 align-middle'
    if (p.registered && p.present) return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>Registered</span>
    if (p.registered) return <span className={`${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}>Registered</span>
    if (p.present) return <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>Walk-in</span>
    return null
  }
  return (
    <div>
      {!state.series && <p className="text-sm text-gray-500 dark:text-gray-400">This group is not available.</p>}

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
                  <button type="button" aria-label={`Remove ${p.name}`} className="text-gray-400 dark:text-slate-500 text-lg leading-none"
                    onClick={() => setConfirmRemove(p.id)}>×</button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={query} onChange={e => typeQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
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

          {state.did_not_meet && (
            <p className="text-sm rounded-lg px-3 py-2 mb-3 bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              Marked as did not meet on {formatDate(state.event_date)}. Checking someone in or saving a count will clear this.
            </p>
          )}

          {state.counts_only ? (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">This group records numbers only, men and women separately. No names are kept.</p>
              <div className="flex items-end gap-3 mb-3">
                <div>
                  <label htmlFor="cr-men" className="block text-sm text-black dark:text-white mb-1">Men</label>
                  <input id="cr-men" type="number" min={0} max={500} inputMode="numeric" value={men}
                    onChange={e => setMen(e.target.value)}
                    className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <label htmlFor="cr-women" className="block text-sm text-black dark:text-white mb-1">Women</label>
                  <input id="cr-women" type="number" min={0} max={500} inputMode="numeric" value={women}
                    onChange={e => setWomen(e.target.value)}
                    className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-900" />
                </div>
                <p className="pb-2 text-sm text-gray-500 dark:text-gray-400">Total {(Number(men) || 0) + (Number(women) || 0)}</p>
              </div>
              <button type="button" onClick={saveCounts} disabled={men === '' || women === ''}
                className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50">{saved ? 'Saved' : 'Save'}</button>
              <button type="button" onClick={() => setDidNotMeet(!state.did_not_meet)}
                className="ml-2 px-3 py-2 rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 text-sm font-medium whitespace-nowrap">{state.did_not_meet ? 'Undo did not meet' : 'Did not meet'}</button>
            </div>
          ) : (
            <>
              {known ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <p>Registered: {registeredCount} · Attended: {present}</p>
                  {noShows.length > 0 && <p>Registered, not checked in: {noShows.map(p => p.name).join(', ')}</p>}
                  {walkIns.length > 0 && <p>Came without registering: {walkIns.map(p => p.name).join(', ')}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Regulars: {present} of {roster.length} here</p>
              )}
              {roster.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No regulars yet. Add the people who come to this group below, and they will show up here every week.</p>
              )}
              <ul className="divide-y divide-gray-200 dark:divide-gray-800 mb-4">
                {roster.map(p => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                    <span className="text-black dark:text-white text-[15px]">{p.name}{pill(p)}</span>
                    <div className="flex items-center gap-3">
                      {p.regular === false && (
                        <button type="button" className="text-xs text-green-700 dark:text-green-400" onClick={() => addRegular(p.id, p.name)}>Make regular</button>
                      )}
                      {confirmRemove === p.id ? (
                        <span className="flex items-center gap-2 text-sm">
                          <button type="button" className="text-red-600" onClick={() => removeRegular(p.id)}>Remove</button>
                          <button type="button" className="text-gray-500 dark:text-gray-400" onClick={() => setConfirmRemove(null)}>Keep</button>
                        </span>
                      ) : (
                        <button type="button" aria-label={`Remove ${p.name} from regulars`} className="text-gray-400 dark:text-slate-500 text-lg leading-none"
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
                  <input value={query} onChange={e => typeQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
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
                <button type="button" onClick={() => setDidNotMeet(!state.did_not_meet)}
                className="px-2 py-1 rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 text-sm font-medium whitespace-nowrap shrink-0">{state.did_not_meet ? 'Undo did not meet' : 'Did not meet'}</button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}

function statusPill(status?: string) {
  const base = 'text-xs font-medium rounded-full px-2 py-0.5 align-middle'
  if (!status || status === 'no sessions yet') return <span className={`${base} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`}>{status ?? ''}</span>
  if (status === 'not logged') return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}>Not logged</span>
  if (status === 'did not meet') return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100`}>Did not meet</span>
  return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>{status}</span>
}

// One collapsible group, same nested style as the Serving tab: a heading with a one-line status, and the group's
// attendance inside. The body loads the first time it is opened.
function GroupSection({ item }: { item: SeriesItem }) {
  const [opened, setOpened] = useState(false)
  return (
    <section className="mb-4">
      <details className="group" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true) }}>
        <summary className="flex items-center gap-2 cursor-pointer select-none mb-2 list-none">
          <svg className="shrink-0 w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M7 4l6 6-6 6V4z" />
          </svg>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-black dark:text-white">{item.title}</span>
            {item.latest_date && <span className="block text-xs text-gray-500 dark:text-gray-400">{formatDate(item.latest_date)}</span>}
          </span>
          <span className="shrink-0 whitespace-nowrap">{statusPill(item.latest_status)}</span>
        </summary>
        <div className="mt-2">{opened && <GroupPanel series={item.series} />}</div>
      </details>
    </section>
  )
}

export default function GroupsBoard({ groupToken }: { groupToken?: string } = {}) {
  const [items, setItems] = useState<SeriesItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (groupToken) return
    fetch('/api/cat/groups/state')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: State) => setItems(d.series_list))
      .catch(() => setError('Could not load. Try again.'))
  }, [groupToken])

  // A leader's per-group link: just that group, no list around it.
  if (groupToken) return <GroupPanel groupToken={groupToken} />
  if (!items) return <p className="text-gray-500 dark:text-gray-400">{error ?? 'Loading...'}</p>

  const sunday = items.filter(i => i.sunday)
  const other = items.filter(i => !i.sunday)
  return (
    <div>
      {sunday.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Sunday groups</h2>
          {sunday.map(i => <GroupSection key={i.series} item={i} />)}
        </>
      )}
      {other.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-6 mb-3">Other groups and events</h2>
          {other.map(i => <GroupSection key={i.series} item={i} />)}
        </>
      )}
    </div>
  )
}
