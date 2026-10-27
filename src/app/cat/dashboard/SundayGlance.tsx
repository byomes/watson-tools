'use client'

import { useState } from 'react'
import { Card, Loading, btnGhost, useChm, type Row } from './chm'

type Sunday = {
  date: string; wilmington: number; online: number; total: number; headcount: number | null
  kids: number; class_adults: number | null; serving: number; first_time: number; cards: number
  rooms: Record<string, { kids: number; adults: number }> | null
  checkins: Record<string, number>
  adult_class: number
  adult_class_groups: { name: string; count: number }[]
}

const ROOM_LABELS: [string, string][] = [['nursery', 'Nursery'], ['toddlers', 'Toddlers'], ['prek', 'Pre-K'], ['elementary', 'Elementary']]

// weeks = how many earlier Sundays form the baseline: 4 (about a month) for the big numbers, 8 for the small, jumpy ones.
const METRICS: { key: keyof Sunday; label: string; sub?: string; weeks: number }[] = [
  { key: 'total', weeks: 4, label: 'Total named', sub: 'both campuses' },
  { key: 'wilmington', weeks: 4, label: 'Wilmington', sub: 'named in the room' },
  { key: 'online', weeks: 4, label: 'Online', sub: 'named online' },
  { key: 'headcount', weeks: 4, label: 'Headcount', sub: "Donna's count" },
  { key: 'kids', weeks: 8, label: 'Kids', sub: 'checked in' },
  { key: 'adult_class', weeks: 4, label: 'Adult Sunday class', sub: 'groups ticked in Groups' },
  { key: 'class_adults', weeks: 8, label: 'Kids-room adults', sub: 'volunteers in kids rooms' },
  { key: 'serving', weeks: 4, label: 'Serving', sub: 'people on teams' },
  { key: 'first_time', weeks: 8, label: 'First-time', sub: 'first ever Sunday' },
  { key: 'cards', weeks: 4, label: 'Connect cards', sub: 'turned in' },
]

function longDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function shortDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Delta({ now, avg, weeks }: { now: number | null; avg: number | null; weeks: number }) {
  if (now == null || avg == null) return <span className="text-xs text-slate-400">no comparison</span>
  const d = Math.round((now - avg) * 10) / 10
  if (d === 0) return <span className="text-xs text-slate-400">on the {weeks}-week average ({avg})</span>
  return (
    <span className={`text-xs font-medium ${d > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d)} vs {weeks}-week average ({avg})
    </span>
  )
}

export default function SundayGlance() {
  const { data, error } = useChm<{ sundays: Sunday[] }>('sundays')
  const [idx, setIdx] = useState(0)
  const [history, setHistory] = useState(false)
  if (!data) return <Loading error={error} />
  const list = data.sundays
  if (!list.length) return null
  const cur = list[Math.min(idx, list.length - 1)]
  const prev = list[idx + 1]
  const avg = (k: keyof Sunday, weeks: number) => {
    const xs = list.slice(idx + 1, idx + 1 + weeks).map((s) => s[k]).filter((v): v is number => typeof v === 'number')
    return xs.length >= 2 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null
  }
  const arrow = 'h-9 w-9 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <Card
      title="Sunday at a glance"
      action={<button type="button" className={btnGhost} onClick={() => setHistory((h) => !h)}>{history ? 'Back to this Sunday' : 'History'}</button>}
    >
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <button type="button" className={arrow} aria-label="Older Sunday" disabled={idx >= list.length - 1} onClick={() => setIdx(idx + 1)}>‹</button>
          <div className="flex-1 text-center">
            <div className="text-base font-semibold text-slate-900 dark:text-white">{longDate(cur.date)}</div>
            <div className="text-xs text-slate-400">{idx === 0 ? 'Most recent Sunday' : `${idx} ${idx === 1 ? 'week' : 'weeks'} earlier`}</div>
          </div>
          <button type="button" className={arrow} aria-label="Newer Sunday" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>›</button>
        </div>

        {!history ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {METRICS.map((m) => {
              const v = cur[m.key] as number | null
              const a = avg(m.key, m.weeks)
              const last = prev ? (prev[m.key] as number | null) : null
              return (
                <div key={m.key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{m.label}</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{v ?? <span className="text-base font-medium text-slate-400">not in yet</span>}</div>
                  <div><Delta now={v} avg={a} weeks={m.weeks} /></div>
                  <div className="text-[11px] text-slate-400">{m.sub}{last != null ? ` · Sunday before: ${last}` : ''}</div>
                </div>
              )
            })}
            <div className="col-span-2 sm:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Kids and nursery by room</div>
                {cur.rooms ? (
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-slate-400 text-left"><th className="font-normal">Room</th><th className="font-normal text-right">Kids</th><th className="font-normal text-right">Adults</th></tr></thead>
                    <tbody>
                      {ROOM_LABELS.map(([k, label]) => (
                        <tr key={k} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{label}</td><td className="text-right tabular-nums">{cur.rooms![k]?.kids ?? 0}</td><td className="text-right tabular-nums">{cur.rooms![k]?.adults ?? 0}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-xs text-slate-400">Donna has not entered the classroom counts for this Sunday yet.</p>}
                <p className="text-[11px] text-slate-400 mt-1">From the classroom sheet.</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Checked in on the app</div>
                {Object.keys(cur.checkins).length ? (
                  <ul className="text-sm">
                    {Object.entries(cur.checkins).sort(([a], [b]) => a.localeCompare(b)).map(([name, n]) => (
                      <li key={name} className="flex justify-between border-t border-slate-100 dark:border-slate-800 py-1 first:border-0"><span>{name}</span><span className="tabular-nums">{n}</span></li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-slate-400">No check-ins recorded.</p>}
                <p className="text-[11px] text-slate-400 mt-1">Kids checked in, by class.</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Adult Sunday class by group</div>
                {cur.adult_class_groups.length ? (
                  <ul className="text-sm">
                    {cur.adult_class_groups.map((g) => (
                      <li key={g.name} className="flex justify-between border-t border-slate-100 dark:border-slate-800 py-1 first:border-0"><span>{g.name}</span><span className="tabular-nums">{g.count}</span></li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-slate-400">Nothing counted. Tick the groups to include on the Groups page, or none of them met.</p>}
                <p className="text-[11px] text-slate-400 mt-1">A group counts its headcount if one was entered, otherwise people marked present plus guests.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-1.5 pr-3 font-medium">Sunday</th>
                  {METRICS.map((m) => <th key={m.key} className="py-1.5 px-2 font-medium text-right whitespace-nowrap">{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.date} onClick={() => { setIdx(i); setHistory(false) }}
                    className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${i === idx ? 'bg-slate-100 dark:bg-slate-800 font-semibold' : ''}`}>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{shortDate(s.date)}</td>
                    {METRICS.map((m) => <td key={m.key} className="py-1.5 px-2 text-right tabular-nums">{(s[m.key] as number | null) ?? '–'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Tap a row to open that Sunday. Newest first.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
