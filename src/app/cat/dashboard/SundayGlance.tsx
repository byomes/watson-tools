'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Card, Loading, PersonLink, btnGhost, useChm, useNav } from './chm'

type SmallGroup = { name: string; teens: number; adults: number; other: number; guests: number; headcount?: number | null }
type Sunday = {
  date: string; wilmington: number; online: number; total: number; headcount: number | null
  kids: number; class_adults: number | null; serving: number; first_time: number; cards: number
  rooms: Record<string, { kids: number; adults: number }> | null
  checkins: Record<string, number>
  small_groups: SmallGroup[]
  small_teens: number; small_adults: number; small_guests: number; small_other: number
  small_total: number
}

type Peek = { date: string; kind: string; title: string; group?: string; klass?: string }
type Who = { note: string; people: { id: number; name: string; detail: string }[]; kids: { id: number; name: string; detail: string }[] }


// weeks = how many earlier Sundays form the baseline: 4 (about a month) for the big numbers, 8 for the small, jumpy ones.
type Metric = { key: keyof Sunday; label: string; sub?: string; weeks: number }
const M = (key: keyof Sunday, weeks: number, label: string, sub?: string): Metric => ({ key, weeks, label, sub })
// The plain tiles. Kids (with the adults in the kids rooms) and Sunday small groups get their own tiles among them.
const TILES: Metric[] = [
  M('total', 4, 'Total named', 'both campuses'),
  M('wilmington', 4, 'Wilmington', 'named in the room'),
  M('online', 4, 'Online', 'named online'),
  M('headcount', 4, 'Headcount', "Donna's count"),
  M('serving', 4, 'Serving', 'people on teams'),
  M('first_time', 8, 'First-time', 'first ever Sunday'),
  M('cards', 4, 'Connect cards', 'turned in'),
]
const KIDS = M('kids', 8, 'Kids', 'checked in')
const KIDS_ADULTS = M('class_adults', 8, 'Adults with the kids', 'volunteers in the kids rooms')
const SMALL = M('small_total', 4, 'Sunday small groups', 'teens + adults named present')
// History table columns, in order.
const HISTORY: Metric[] = [
  TILES[0], TILES[1], TILES[2], TILES[3], KIDS, KIDS_ADULTS,
  M('small_teens', 4, 'Small group teens'), M('small_adults', 4, 'Small group adults'),
  TILES[4], TILES[5], TILES[6],
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

function PeekBox({ peek, onClose }: { peek: Peek; onClose: () => void }) {
  const { go } = useNav()
  const q = `sunday-people?date=${peek.date}&kind=${peek.kind}${peek.group ? `&group=${encodeURIComponent(peek.group)}` : ''}${peek.klass ? `&class=${encodeURIComponent(peek.klass)}` : ''}`
  const { data, error } = useChm<Who>(q)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const rows = data ? (data.kids.length ? data.kids : data.people) : []
  const isKids = !!data && data.kids.length > 0
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{peek.title}</div>
            <div className="text-xs text-slate-400">{longDate(peek.date)}{data && !data.note ? ` · ${rows.length} ${rows.length === 1 ? 'person' : 'people'}` : ''}</div>
          </div>
          <button type="button" className={btnGhost} onClick={onClose}>Close</button>
        </div>
        <div className="overflow-auto px-4 py-2">
          {!data ? <p className="text-sm text-slate-500 py-3">{error || 'Loading…'}</p> : data.note && rows.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-3">{data.note}</p>
          ) : rows.length === 0 ? <p className="text-sm text-slate-500 py-3">No one.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <li key={r.id} className="py-1.5 flex items-baseline gap-2 text-sm">
                  {isKids
                    ? <button type="button" className="text-left font-medium text-slate-900 dark:text-white hover:underline" onClick={() => { onClose(); go(`kid/${r.id}`) }}>{r.name}</button>
                    : <span onClick={onClose}><PersonLink id={r.id} name={r.name} /></span>}
                  <span className="flex-1" />
                  <span className="text-xs text-slate-400 text-right">{r.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {data && data.note && rows.length > 0 && <p className="text-xs text-slate-400 py-2">{data.note}</p>}
        </div>
      </div>
    </div>
  )
}

export default function SundayGlance() {
  const { data, error } = useChm<{ sundays: Sunday[] }>('sundays')
  const [idx, setIdx] = useState(0)
  const [history, setHistory] = useState(false)
  const [peek, setPeek] = useState<Peek | null>(null)
  if (!data) return <Loading error={error} />
  const list = data.sundays.map((s) => ({ ...s, small_total: s.small_teens + s.small_adults }))
  if (!list.length) return null
  const cur = list[Math.min(idx, list.length - 1)]
  const prev = list[idx + 1]
  const avg = (k: keyof Sunday, weeks: number) => {
    const xs = list.slice(idx + 1, idx + 1 + weeks).map((s) => s[k]).filter((v): v is number => typeof v === 'number')
    return xs.length >= 2 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null
  }
  const last = (m: Metric) => (prev ? (prev[m.key] as number | null) : null)
  const arrow = 'h-9 w-9 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent'
  const box = 'rounded-lg border border-slate-200 dark:border-slate-800 p-3'
  const noGroups = cur.small_groups.length === 0
  // Every number is a link: tap it to see the names counted in it.
  const N = (v: ReactNode, kind: string, title: string, extra: { group?: string; klass?: string; date?: string } = {}) => (
    <button type="button" className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
      onClick={(e) => { e.stopPropagation(); setPeek({ date: extra.date ?? cur.date, kind, title, group: extra.group, klass: extra.klass }) }}>{v}</button>
  )

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
            {TILES.slice(0, 4).map((m) => {
              const v = cur[m.key] as number | null
              return (
                <div key={m.key} className={box}>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{m.label}</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{v == null ? <span className="text-base font-medium text-slate-400">not in yet</span> : N(v, m.key as string, m.label)}</div>
                  <div><Delta now={v} avg={avg(m.key, m.weeks)} weeks={m.weeks} /></div>
                  <div className="text-[11px] text-slate-400">{m.sub}{last(m) != null ? ` · Sunday before: ${last(m)}` : ''}</div>
                </div>
              )
            })}

            {/* Kids, with the adults who are with them in the kids rooms */}
            <div className={box}>
              <div className="text-xs text-slate-500 dark:text-slate-400">Kids and the adults with them</div>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{N(cur.kids, 'kids', 'Kids checked in')}</div>
                  <div className="text-[11px] text-slate-400">kids</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{cur.class_adults == null ? <span className="text-base font-medium text-slate-400">not in yet</span> : N(cur.class_adults, 'class_adults', 'Adults with the kids')}</div>
                  <div className="text-[11px] text-slate-400">adults with them</div>
                </div>
              </div>
              <div><Delta now={cur.kids} avg={avg(KIDS.key, KIDS.weeks)} weeks={KIDS.weeks} /></div>
              <div className="text-[11px] text-slate-400">Kids: Sunday before {last(KIDS) ?? 'n/a'}{last(KIDS_ADULTS) != null ? ` · adults ${last(KIDS_ADULTS)}` : ''}</div>
            </div>

            {/* Sunday morning small groups: teens and adults in the groups ticked on the Groups page */}
            <div className={box}>
              <div className="text-xs text-slate-500 dark:text-slate-400">Sunday morning small groups</div>
              {noGroups ? (
                <p className="text-sm text-slate-400 mt-1">No numbers. Tick the Sunday small groups on the Groups page, or none of them met.</p>
              ) : (
                <>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{N(cur.small_teens, 'small_teens', 'Small group teens')}</div>
                      <div className="text-[11px] text-slate-400">teens</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{N(cur.small_adults, 'small_adults', 'Small group adults')}</div>
                      <div className="text-[11px] text-slate-400">adults</div>
                    </div>
                  </div>
                  <div><Delta now={cur.small_total} avg={avg(SMALL.key, SMALL.weeks)} weeks={SMALL.weeks} /></div>
                  <div className="text-[11px] text-slate-400">
                    {cur.small_guests ? <>+ {N(cur.small_guests, 'small_guests', 'Small group guests')} guests</> : 'no guests counted'}{cur.small_other ? <> · {N(cur.small_other, 'small_other', 'Small groups: under 13 or no birthday')} under 13 or no birthday</> : ''}{last(SMALL) != null ? ` · Sunday before: ${last(SMALL)}` : ''}
                  </div>
                </>
              )}
            </div>

            {TILES.slice(4).map((m) => {
              const v = cur[m.key] as number | null
              return (
                <div key={m.key} className={box}>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{m.label}</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{v == null ? <span className="text-base font-medium text-slate-400">not in yet</span> : N(v, m.key as string, m.label)}</div>
                  <div><Delta now={v} avg={avg(m.key, m.weeks)} weeks={m.weeks} /></div>
                  <div className="text-[11px] text-slate-400">{m.sub}{last(m) != null ? ` · Sunday before: ${last(m)}` : ''}</div>
                </div>
              )
            })}

          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-1.5 pr-3 font-medium">Sunday</th>
                  {HISTORY.map((m) => <th key={m.key} className="py-1.5 px-2 font-medium text-right whitespace-nowrap">{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.date} onClick={() => { setIdx(i); setHistory(false) }}
                    className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${i === idx ? 'bg-slate-100 dark:bg-slate-800 font-semibold' : ''}`}>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{shortDate(s.date)}</td>
                    {HISTORY.map((m) => <td key={m.key} className="py-1.5 px-2 text-right tabular-nums">{(s[m.key] as number | null) == null ? '–' : N(s[m.key] as number, m.key as string, m.label, { date: s.date })}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Tap a row to open that Sunday. Newest first.</p>
          </div>
        )}
      </div>
      {peek && <PeekBox key={`${peek.date}${peek.kind}${peek.group}${peek.klass}`} peek={peek} onClose={() => setPeek(null)} />}
    </Card>
  )
}
