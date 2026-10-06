'use client'

import { useEffect, useMemo, useState } from 'react'

interface Item { date: string; group?: string; team?: string; event?: string }
interface Person {
  id: number
  name: string
  deacon: string | null
  ladder: string
  worship: number
  groups: number
  serving: number
  events: number
  teams: string[]
  flag: string
  group_list: Item[]
  serving_list: Item[]
  event_list: Item[]
  last_worship: string | null
}
interface Data {
  window_days: number
  coverage: { group_since: string | null; serving_since: string | null; flags_reliable: boolean }
  people: Person[]
}

const FLAGS: { key: string; label: string; cls: string }[] = [
  { key: 'worship-only', label: 'Worship only', cls: 'bg-amber-100 text-amber-800' },
  { key: 'slipping', label: 'Slipping', cls: 'bg-red-100 text-red-800' },
  { key: 'new', label: 'New', cls: 'bg-blue-100 text-blue-800' },
  { key: 'connected', label: 'Connected', cls: 'bg-green-100 text-green-800' },
]
const flagMeta = (k: string) => FLAGS.find(f => f.key === k)

function fmt(iso: string | null): string {
  if (!iso) return 'none'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-semibold ${n ? 'text-black' : 'text-gray-300'}`}>{n}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  )
}

export default function ConnectionBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/cat/connection/state')
      .then(r => (r.status === 401 ? Promise.reject('login') : r.ok ? r.json() : Promise.reject('err')))
      .then((d: Data) => setData(d))
      .catch(e => setError(e === 'login' ? 'Your session ended. Sign in again at the Shepherding App.' : 'Could not load. Try again.'))
  }, [])

  const people = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.people.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!filter || p.flag === filter))
  }, [data, query, filter])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <p className="text-gray-500">Loading...</p>

  const { coverage } = data
  return (
    <div>
      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        Last {data.window_days} days. Worship counts Sundays attended. Serving tracking began {fmt(coverage.serving_since)}
        {coverage.group_since ? `, group tracking ${fmt(coverage.group_since)}` : ', group tracking has not started yet'}, so
        those counts are partial until a full window of history builds up.
        {!coverage.flags_reliable && ' The "Worship only" flag turns on once group tracking is about 8 weeks old.'}
      </div>

      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a name"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black bg-white mb-3" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FLAGS.filter(f => f.key !== 'worship-only' || coverage.flags_reliable).map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(filter === f.key ? null : f.key)}
            className={`px-3 py-1 rounded-full text-sm ${filter === f.key ? 'ring-2 ring-black' : ''} ${f.cls}`}>
            {f.label} ({data.people.filter(p => p.flag === f.key).length})
          </button>
        ))}
      </div>

      <ul className="divide-y divide-gray-200">
        {people.map(p => {
          const meta = flagMeta(p.flag)
          const isOpen = open === p.id
          return (
            <li key={p.id} className="py-3">
              <button type="button" className="w-full text-left" onClick={() => setOpen(isOpen ? null : p.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-black text-[15px] font-medium">{p.name}</span>
                    {meta && <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>}
                    <span className="block text-xs text-gray-500">
                      {p.ladder}{p.deacon ? ` · ${p.deacon}` : ''}
                    </span>
                  </div>
                  <div className="flex gap-4 shrink-0">
                    <Stat n={p.worship} label="worship" />
                    <Stat n={p.groups} label="groups" />
                    <Stat n={p.serving} label="serving" />
                    <Stat n={p.events} label="events" />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 text-sm text-black space-y-2 pl-1">
                  <p><span className="text-gray-500">Last worship:</span> {fmt(p.last_worship)}</p>
                  <p><span className="text-gray-500">On teams:</span> {p.teams.length ? p.teams.join(', ') : 'none'}</p>
                  <p><span className="text-gray-500">Groups:</span>{' '}
                    {p.group_list.length ? p.group_list.map(g => `${g.group} (${fmt(g.date)})`).join(', ') : 'none recorded'}</p>
                  <p><span className="text-gray-500">Served:</span>{' '}
                    {p.serving_list.length ? p.serving_list.map(s => `${s.team} (${fmt(s.date)})`).join(', ') : 'none recorded'}</p>
                  <p><span className="text-gray-500">Events:</span>{' '}
                    {p.event_list.length ? p.event_list.map(e => `${e.event} (${fmt(e.date)})`).join(', ') : 'none'}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {people.length === 0 && <p className="text-gray-500 mt-4">No one matches.</p>}
    </div>
  )
}
