'use client'

import { useCallback, useEffect, useState } from 'react'

type EventInfo = { id: number; event_name: string; start_date: string; event_time: string | null }
type Report = {
  yes: string[]
  no: string[]
  no_response: string[]
  total_adults: number
  total_children: number
  invited_count: number
  member_ids?: Record<string, number>
}
type Recent = { name: string; status: string; guests: number; kids: number; at: string }
type Data = { events: EventInfo[]; event: EventInfo | null; report?: Report; recent?: Recent[]; manual?: Record<string, number> }
type Tab = 'no_response' | 'yes' | 'no'

const REFRESH_MS = 10000

function niceDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function ago(stamp: string) {
  // created_at is stored UTC as "YYYY-MM-DD HH:MM:SS"
  const t = Date.parse(stamp.replace(' ', 'T') + 'Z')
  if (!Number.isFinite(t)) return ''
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

export default function EventsBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [eventId, setEventId] = useState(0)
  const [tab, setTab] = useState<Tab>('no_response')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState<Date | null>(null)
  const [, tick] = useState(0)
  const [asking, setAsking] = useState<number | null>(null) // member id whose Yes form is open
  const [adults, setAdults] = useState(1)
  const [kids, setKids] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cat/events/rsvp?event_id=${eventId}`, { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/cat/catalystdb/login?next=/cat/events'
        return
      }
      if (!res.ok) throw new Error('load')
      setData(await res.json())
      setUpdated(new Date())
      setError('')
    } catch {
      setError('Could not refresh. Retrying...')
    }
  }, [eventId])

  useEffect(() => {
    load()
    const refresh = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, REFRESH_MS)
    const clock = setInterval(() => tick((n) => n + 1), 5000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(refresh)
      clearInterval(clock)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  async function send(path: 'set' | 'undo', body: Record<string, unknown>) {
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch(`/api/cat/events/rsvp/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: data?.event?.id, ...body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) setNotice(j.error || 'Could not save that.')
      else {
        setAsking(null)
        setAdults(1)
        setKids(0)
        await load()
      }
    } catch {
      setNotice('Could not save that. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 min-h-screen">{error || 'Loading...'}</div>
  }
  if (!data.event || !data.report) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 min-h-screen">No events are collecting RSVPs right now.</div>
  }

  const { event, report } = data
  const responded = report.yes.length + report.no.length
  const total = responded + report.no_response.length
  const pct = total ? Math.round((responded / total) * 100) : 0
  const lists: Record<Tab, string[]> = { no_response: report.no_response, yes: report.yes, no: report.no }
  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'no_response', label: 'No response', n: report.no_response.length },
    { key: 'yes', label: 'Yes', n: report.yes.length },
    { key: 'no', label: 'No', n: report.no.length },
  ]
  const secs = updated ? Math.max(0, Math.round((Date.now() - updated.getTime()) / 1000)) : 0

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {data.events.length > 1 ? (
              <select
                value={event.id}
                onChange={(e) => setEventId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-lg font-semibold"
              >
                {data.events.map((e) => (
                  <option key={e.id} value={e.id}>{e.event_name}</option>
                ))}
              </select>
            ) : (
              <h1 className="text-xl font-semibold">{event.event_name}</h1>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {niceDate(event.start_date)}{event.event_time ? `, ${event.event_time}` : ''}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 text-right shrink-0">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1 align-middle" />
            {error || `Live, updated ${secs < 5 ? 'now' : `${secs}s ago`}`}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Adults coming', value: report.total_adults, note: 'food headcount' },
            { label: 'Kids (childcare)', value: report.total_children, note: 'separate from adults' },
            { label: 'Said no', value: report.no.length, note: 'people' },
            { label: 'Still waiting', value: report.no_response.length, note: `of ${report.invited_count} invited` },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
              <div className="text-2xl font-semibold tabular-nums">{c.value}</div>
              <div className="text-xs font-medium">{c.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.note}</div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{responded} of {total} responded</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 flex gap-1 rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === t.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.label} ({t.n})
            </button>
          ))}
        </div>

        {notice && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{notice}</div>}
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
          {lists[tab].length === 0 && <li className="py-2 text-slate-500 dark:text-slate-400">Nobody here.</li>}
          {lists[tab].map((n) => {
            const mid = report.member_ids?.[n]
            const handEntered = mid !== undefined && data.manual?.[String(mid)] !== undefined
            const btn = 'rounded-md border px-3 py-1 text-xs font-semibold disabled:opacity-50'
            return (
              <li key={n} className="py-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span>{n}{handEntered && <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">(entered by hand)</span>}</span>
                  {tab === 'no_response' && mid !== undefined && (
                    <span className="flex gap-1 shrink-0">
                      <button
                        disabled={busy}
                        onClick={() => { setAsking(asking === mid ? null : mid); setAdults(1); setKids(0) }}
                        className={`${btn} border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500`}
                      >
                        Yes
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => send('set', { member_id: mid, status: 'no' })}
                        className={`${btn} border-red-600 text-red-700 dark:text-red-400 dark:border-red-500`}
                      >
                        No
                      </button>
                    </span>
                  )}
                  {tab !== 'no_response' && handEntered && (
                    <button disabled={busy} onClick={() => send('undo', { member_id: mid })} className={`${btn} border-slate-400 text-slate-600 dark:text-slate-300`}>
                      Undo
                    </button>
                  )}
                </div>
                {tab === 'no_response' && asking === mid && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs">
                    <label className="flex items-center gap-1">
                      Adults coming
                      <input type="number" min={1} max={10} value={adults} onChange={(e) => setAdults(Number(e.target.value) || 1)} className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5" />
                    </label>
                    <label className="flex items-center gap-1">
                      Kids for childcare
                      <input type="number" min={0} max={15} value={kids} onChange={(e) => setKids(Number(e.target.value) || 0)} className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5" />
                    </label>
                    <button disabled={busy} onClick={() => send('set', { member_id: mid, status: 'yes', adults, kids })} className="rounded-md bg-emerald-600 text-white px-3 py-1 font-semibold disabled:opacity-50">
                      Save yes
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <h2 className="mt-7 text-sm font-semibold">Latest RSVPs</h2>
        <ul className="mt-1 text-sm">
          {(data.recent ?? []).length === 0 && <li className="py-2 text-slate-500 dark:text-slate-400">None yet.</li>}
          {(data.recent ?? []).map((r, i) => (
            <li key={`${r.name}-${r.at}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>
                {r.name}{' '}
                <span className={r.status === 'no' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {r.status === 'no' ? 'can’t make it' : r.kids ? `coming, ${r.kids} kid${r.kids === 1 ? '' : 's'}` : 'coming'}
                </span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{ago(r.at)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Yes and No on a name record an RSVP by hand; hand-entered ones can be undone. Refreshes every 10 seconds. Adults counts everyone who said yes, including spouses and guests who are not on a team.
        </p>
      </div>
    </div>
  )
}
