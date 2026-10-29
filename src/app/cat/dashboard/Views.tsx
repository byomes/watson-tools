'use client'
import { sortByLastName, sortKidsByLastName } from '@/lib/people'

import { useMemo, useState } from 'react'
import SundayGlance from './SundayGlance'
import { DSS_CHURCH, DSS_TAGLINE } from '@/lib/dssConfig'
import CatalystDBBoard, { type BoardSpec } from '../catalystdb/(gated)/CatalystDBBoard'
import {
  Card, ConnBadge, Empty, Loading, Pill, PersonLink, PersonPicker, btnCls, btnGhost, attempt, chm, fmtDate, ago, inputCls,
  useChm, useNav, type Row,
} from './chm'

// ------------------------------------------------------------------ Home

function Stat({ label, value, sub, onClick, tone }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void; tone?: 'warn' }) {
  const body = (
    <>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </>
  )
  const cls = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left'
  return onClick ? <button type="button" onClick={onClick} className={`${cls} hover:border-slate-400 dark:hover:border-slate-600`}>{body}</button> : <div className={cls}>{body}</div>
}

const BUCKET_ORDER = ['regular', 'at risk', 'critical', 'disconnected', 'guest', '2nd time', '1st time', 'neighbor']
const BUCKET_BAR: Record<string, string> = {
  regular: 'bg-emerald-500', 'at risk': 'bg-amber-500', critical: 'bg-red-500', disconnected: 'bg-slate-400',
  guest: 'bg-violet-500', '2nd time': 'bg-sky-400', '1st time': 'bg-sky-500', neighbor: 'bg-slate-300',
}

const CAMPUS_STROKE = ['stroke-emerald-500', 'stroke-sky-500', 'stroke-violet-500', 'stroke-amber-500']
const CAMPUS_FILL = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500']

// Line chart with an axis fitted to the data (not zero-based), so week-to-week ups and downs are visible.
function TrendChart({ trend }: { trend: Row[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const { dates, campuses, totals, byCampus } = useMemo(() => {
    const per: Record<string, Record<string, number>> = {}
    const campusTotals: Record<string, number> = {}
    trend.forEach((t) => {
      const c = (t.campus as string) || 'Other'
      per[t.service_date] = per[t.service_date] ?? {}
      per[t.service_date][c] = (per[t.service_date][c] ?? 0) + t.n
      campusTotals[c] = (campusTotals[c] ?? 0) + t.n
    })
    const dates = Object.keys(per).sort().slice(-26)
    const campuses = Object.keys(campusTotals).sort((a, b) => campusTotals[b] - campusTotals[a]).slice(0, 4)
    const totals = dates.map((d) => Object.values(per[d]).reduce((x, y) => x + y, 0))
    const byCampus = campuses.map((c) => dates.map((d) => per[d][c] ?? 0))
    return { dates, campuses, totals, byCampus }
  }, [trend])
  if (!dates.length) return <Empty>No attendance yet.</Empty>

  const W = 640, H = 220, L = 34, R = 12, T = 16, B = 26
  const all = [...totals, ...byCampus.flat()]
  const lo0 = Math.min(...all), hi0 = Math.max(...all)
  const step = hi0 - lo0 > 60 ? 20 : hi0 - lo0 > 25 ? 10 : 5
  const lo = Math.max(0, Math.floor((lo0 - step / 2) / step) * step)
  const hi = Math.ceil((hi0 + step / 2) / step) * step
  const x = (i: number) => L + (dates.length === 1 ? (W - L - R) / 2 : (i / (dates.length - 1)) * (W - L - R))
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B)
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks: number[] = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length
  const maxI = totals.indexOf(Math.max(...totals)), minI = totals.indexOf(Math.min(...totals))
  const last = totals.length - 1
  const delta = last > 0 ? totals[last] - totals[last - 1] : 0
  const labelEvery = Math.ceil(dates.length / 8)
  const hi_i = hover ?? last

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 text-sm text-slate-600 dark:text-slate-300">
        <span><b className="text-slate-900 dark:text-white text-lg">{totals[hi_i]}</b> on {fmtDate(dates[hi_i])}</span>
        {hover === null && last > 0 && <span className={delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{delta >= 0 ? '+' : ''}{delta} vs previous week</span>}
        <span className="text-slate-400">avg {Math.round(avg)} · high {totals[maxI]} · low {totals[minI]}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Attendance by week" onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-400" fontSize={10}>{v}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(avg)} y2={y(avg)} className="stroke-slate-400" strokeWidth={1} strokeDasharray="4 4" />
        {byCampus.map((vals, ci) => campuses.length > 1 && (
          <path key={campuses[ci]} d={path(vals)} fill="none" className={CAMPUS_STROKE[ci % CAMPUS_STROKE.length]} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        ))}
        <path d={path(totals)} fill="none" className="stroke-slate-800 dark:stroke-slate-100" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {totals.map((v, i) => (
          <circle key={dates[i]} cx={x(i)} cy={y(v)} r={i === hi_i ? 5 : 3} className="fill-white dark:fill-slate-900 stroke-slate-800 dark:stroke-slate-100" strokeWidth={2} />
        ))}
        {[maxI, minI].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={`l${i}`} x={x(i)} y={y(totals[i]) + (i === maxI ? -9 : 17)} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize={11} fontWeight={600}>{totals[i]}</text>
        ))}
        {dates.map((d, i) => (i % labelEvery === 0 || i === last) && (
          <text key={`x${d}`} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400" fontSize={10}>{d.slice(5)}</text>
        ))}
        {dates.map((d, i) => (
          <rect key={`h${d}`} x={x(i) - (W - L - R) / Math.max(1, dates.length - 1) / 2} y={T} width={(W - L - R) / Math.max(1, dates.length - 1)} height={H - T - B}
            fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-800 dark:bg-slate-100" />Total</span>
        {campuses.length > 1 && campuses.map((c, ci) => (
          <span key={c} className="flex items-center gap-1.5"><span className={`h-0.5 w-4 ${CAMPUS_FILL[ci % CAMPUS_FILL.length]}`} />{c}{hover !== null ? ` ${byCampus[ci][hover]}` : ''}</span>
        ))}
        <span className="flex items-center gap-1.5 text-slate-400"><span className="w-4 border-t border-dashed border-slate-400" />Average</span>
      </div>
    </div>
  )
}

export function HomeView({ user }: { user?: string }) {
  const { go } = useNav()
  const { data: s, error } = useChm<Row>('summary')
  if (!s) return <Loading error={error} />
  const total = Object.values(s.connected as Record<string, number>).reduce((a, b) => a + b, 0) || 1
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome{user ? `, ${user}` : ''}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{DSS_CHURCH} &middot; <span className="italic text-nine">{DSS_TAGLINE}</span></p>
      </div>
      <SundayGlance />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active people" value={s.totals.active} sub={`${s.totals.partners} partners`} onClick={() => go('people')} />
        <Stat label="Kids" value={s.totals.kids} onClick={() => go('kids')} />
        <Stat label="Need a deacon" value={s.unassigned_people} tone={s.unassigned_people ? 'warn' : undefined} onClick={() => go('deacons')} />
        <Stat label={s.open_followups !== undefined ? 'Open follow-ups' : 'Prayer, 14 days'} value={s.open_followups ?? s.recent_prayer} onClick={() => go('care')} />
      </div>

      <Card title="How connected is everyone?">
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          {BUCKET_ORDER.filter((b) => s.connected[b]).map((b) => <div key={b} className={BUCKET_BAR[b]} style={{ width: `${(s.connected[b] / total) * 100}%` }} title={`${b}: ${s.connected[b]}`} />)}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {BUCKET_ORDER.filter((b) => s.connected[b]).map((b) => (
            <span key={b} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"><span className={`h-2.5 w-2.5 rounded-full ${BUCKET_BAR[b]}`} />{b} <b>{s.connected[b]}</b></span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Attendance, last 26 weeks"><TrendChart trend={s.trend} /></Card>
        <Card title="Needs attention (at risk and critical)">
          {s.at_risk.length === 0 ? <Empty>Nobody is slipping right now.</Empty> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.at_risk.map((p: Row) => (
                <li key={p.id} className="py-1.5 flex items-center gap-2 text-sm">
                  <PersonLink id={p.id} name={p.name} /> <ConnBadge value={p.connected} />
                  <span className="flex-1" /><span className="text-xs text-slate-400">{p.deacon && p.deacon !== '--' ? p.deacon : 'no deacon'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="New in the last 30 days">
          {s.newcomers.length === 0 ? <Empty>No new first visits.</Empty> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.newcomers.map((p: Row) => (
                <li key={p.id} className="py-1.5 flex items-center text-sm"><PersonLink id={p.id} name={p.name} /><span className="flex-1" /><span className="text-xs text-slate-400">{fmtDate(p.first_visit_date)}</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Coming up (14 days)">
          {s.birthdays.length + s.anniversaries.length === 0 ? <Empty>No birthdays or anniversaries.</Empty> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...s.birthdays.map((b: Row) => ({ ...b, k: 'Birthday' })), ...s.anniversaries.map((b: Row) => ({ ...b, k: 'Anniversary' }))]
                .sort((a, b) => a.date.localeCompare(b.date)).map((b, i) => (
                  <li key={i} className="py-1.5 flex items-center text-sm"><PersonLink id={b.id} name={b.name} /><span className="flex-1" /><span className="text-xs text-slate-400">{b.k} · {fmtDate(b.date)}</span></li>
                ))}
            </ul>
          )}
        </Card>
        <Card title="Data health" action={<button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => go('health')}>Open</button>}>
          <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>{s.issues.matches} card names to confirm</li>
            <li>{s.issues.duplicates} possible duplicate people</li>
            <li>{s.issues.conflicts} contact conflicts to resolve</li>
            <li>{s.issues.kids_unlinked} kids waiting to be linked to a household</li>
          </ul>
        </Card>
        <Card title="Recent changes in this app">
          {s.activity.length === 0 ? <Empty>Edits made here will show up as they happen.</Empty> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.activity.map((a: Row) => (
                <li key={a.id} className="py-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <b>{a.user}</b> {a.action} {a.entity}{a.member_name ? <> for <PersonLink id={a.member_id} name={a.member_name} className="inline" /></> : null}
                  <span className="text-xs text-slate-400"> · {ago(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- People

interface SavedView { id: number; name: string; owner: string; spec: BoardSpec }

export function PeopleView({ onOpenProfile }: { onOpenProfile: (id: number) => void }) {
  const { data, reload } = useChm<{ views: SavedView[] }>('views')
  const [spec, setSpec] = useState<BoardSpec | undefined>(undefined)
  const [applied, setApplied] = useState<{ key: number; spec?: BoardSpec }>({ key: 0 })
  const [current, setCurrent] = useState<BoardSpec | null>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  void spec
  void setSpec

  async function save() {
    if (!current || !name.trim()) return
    if (!(await attempt(() => chm('views', 'POST', { name: name.trim(), spec: current, shared: true })))) return
    setName('')
    setNaming(false)
    reload()
  }
  async function del(v: SavedView) {
    if (!confirm(`Delete the saved view "${v.name}"?`)) return
    if (await attempt(() => chm(`views/${v.id}`, 'DELETE'))) reload()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-xs font-semibold text-slate-500">Views</span>
        <button type="button" className={btnGhost} onClick={() => setApplied((a) => ({ key: a.key + 1, spec: undefined }))}>All people</button>
        {(data?.views ?? []).map((v) => (
          <span key={v.id} className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
            <button type="button" className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg" onClick={() => setApplied((a) => ({ key: a.key + 1, spec: v.spec }))}>{v.name}</button>
            <button type="button" aria-label={`Delete ${v.name}`} className="px-1.5 text-xs text-slate-400 hover:text-red-600" onClick={() => del(v)}>×</button>
          </span>
        ))}
        <span className="flex-1" />
        {naming ? (
          <>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Name this view" className={`${inputCls} w-44`} />
            <button type="button" className={btnCls} disabled={!name.trim()} onClick={save}>Save</button>
            <button type="button" className={btnGhost} onClick={() => setNaming(false)}>Cancel</button>
          </>
        ) : (
          <button type="button" className={btnGhost} onClick={() => setNaming(true)}>Save current filters as a view</button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <CatalystDBBoard key={applied.key} spec={applied.spec} onSpec={setCurrent} onOpenProfile={onOpenProfile} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Kids

export function KidsView() {
  const { go } = useNav()
  const { data, error } = useChm<{ kids: Row[] }>('kids')
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('')
  const kids = useMemo(() => data?.kids ?? [], [data])
  const classes = useMemo(() => Array.from(new Set(kids.map((k) => k.current_class).filter(Boolean))).sort(), [kids])
  const shown = kids.filter((k) => (!cls || k.current_class === cls) && `${k.first_name} ${k.last_name} ${k.parents.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  if (!data) return <Loading error={error} />
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search kids or parents" className={`${inputCls} flex-1 min-w-48`} />
        <select value={cls} onChange={(e) => setCls(e.target.value)} className={inputCls}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="self-center text-sm text-slate-500">{shown.length} kids</span>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {shown.length === 0 && <div className="p-4"><Empty>No kids match.</Empty></div>}
        {sortKidsByLastName(shown).map((k) => (
          <button key={k.id} type="button" onClick={() => go(`kid/${k.id}`)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white">{k.first_name} {k.last_name}</div>
              <div className="text-xs text-slate-500 truncate">{k.parents.length ? k.parents.join(' & ') : 'No parent linked'}</div>
            </div>
            {k.current_class && <Pill tone="blue">{k.current_class}</Pill>}
            <div className="text-right text-xs text-slate-400 w-24">{k.checkins} check-ins<br />{k.last_checkin ? ago(k.last_checkin) : ''}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function KidDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { go } = useNav()
  const { data, error, reload } = useChm<Row>(`kid/${id}`)
  const [edit, setEdit] = useState<Row | null>(null)
  if (!data) return <Loading error={error} />
  const k = data.kid
  const d = edit ?? k
  async function save() {
    if (!edit) return
    if (!(await attempt(() => chm(`kid/${id}`, 'PATCH', { first_name: d.first_name, last_name: d.last_name, gender: d.gender ?? '', current_class: d.current_class ?? '', current_class_9am: d.current_class_9am ?? '', household_id: d.household_id ?? '' })))) return
    setEdit(null)
    reload()
  }
  const field = (key: string, label: string) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">{label}
      <input value={d[key] ?? ''} onChange={(e) => setEdit({ ...d, [key]: e.target.value })} className={inputCls} />
    </label>
  )
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-4">
      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:underline self-start">← Kids</button>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{k.first_name} {k.last_name}</h1>
      <Card title="Details" action={edit ? <span className="flex gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button className={btnCls} onClick={save}>Save</button></span> : null}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {field('first_name', 'First name')}{field('last_name', 'Last name')}{field('gender', 'Gender')}
          {field('current_class', '10 AM class')}{field('current_class_9am', '9 AM class')}{field('household_id', 'Household ID')}
        </div>
      </Card>
      <Card title="Household">
        {data.family.length === 0 ? <Empty>No household linked. Set the household ID above.</Empty> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.family.map((f: Row) => (
              <li key={f.id} className="py-2 flex items-center gap-3 text-sm"><PersonLink id={f.id} name={f.name} /><Pill>{f.household_role}</Pill><span className="text-xs text-slate-400">{f.phone}</span></li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={`Check-ins (${data.checkins.length})`}>
        {data.checkins.length === 0 ? <Empty>None yet.</Empty> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {data.checkins.map((c: Row, i: number) => (
              <li key={i} className="py-1.5 flex gap-3"><span className="w-28 text-slate-500">{fmtDate(c.event_date)}</span><span className="flex-1">{c.class_name}</span><span className="text-xs text-slate-400">{c.guardian_name}</span></li>
            ))}
          </ul>
        )}
      </Card>
      <button type="button" className="hidden" onClick={() => go('kids')} />
    </div>
  )
}

// ---------------------------------------------------------------- Groups

export function GroupsView() {
  const { data, error, reload } = useChm<{ groups: Row[] }>('groups')
  const [open, setOpen] = useState<string | null>(null)
  if (!data) return <Loading error={error} />
  const cats = Array.from(new Set(data.groups.map((g) => g.category)))

  async function add(g: Row, id: number) {
    if (await attempt(() => chm('roster', 'POST', { series: g.key, member_id: id }))) reload()
  }
  async function remove(g: Row, id: number, name: string) {
    if (!confirm(`Remove ${name} from ${g.name}?`)) return
    if (await attempt(() => chm('roster', 'DELETE', { series: g.key, member_id: id }))) reload()
  }
  async function setAdultClass(g: Row, on: boolean) {
    if (await attempt(() => chm('group-setting', 'POST', { series: g.key, adult_sunday_class: on }))) reload()
  }
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {cats.map((cat) => (
        <div key={cat} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</h2>
          {data.groups.filter((g) => g.category === cat).map((g) => {
            const isOpen = open === g.key
            const last = g.meetings[0]
            return (
              <section key={g.key} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button type="button" onClick={() => setOpen(isOpen ? null : g.key)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{g.name}</div>
                    <div className="text-xs text-slate-500">{g.leaders.length ? `Led by ${g.leaders.map((l: Row) => l.name).join(', ')}` : 'No leader set'}</div>
                  </div>
                  <Pill>{g.members.length} on roster</Pill>
                  {last && <span className="text-xs text-slate-400 hidden sm:inline">Last met {fmtDate(last.event_date)} ({last.present})</span>}
                  <span className="text-slate-400">{isOpen ? '▾' : '▸'}</span>
                </button>
                <label className="px-4 pb-3 -mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={!!g.adult_sunday_class} onChange={(e) => setAdultClass(g, e.target.checked)} />
                  This is a Sunday morning small group: count its teens and adults in Sunday at a glance
                </label>
                {isOpen && (
                  <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Roster</h3>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-3">
                        {sortByLastName(g.members).map((m: Row) => (
                          <li key={m.id} className="py-1.5 flex items-center text-sm"><PersonLink id={m.id} name={m.name} />
                            {g.leaders.some((l: Row) => l.id === m.id) && <span className="ml-2"><Pill tone="blue">leader</Pill></span>}
                            <span className="flex-1" /><button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => remove(g, m.id, m.name)}>Remove</button></li>
                        ))}
                      </ul>
                      <PersonPicker onPick={(p) => add(g, p.id)} exclude={g.members.map((m: Row) => m.id)} placeholder="Add someone to this roster…" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Recent meetings</h3>
                      {g.meetings.length === 0 ? <Empty>No attendance taken yet.</Empty> : (
                        <table className="w-full text-sm"><thead><tr className="text-xs text-slate-400 text-left"><th className="font-normal">Date</th><th className="font-normal">Present</th><th className="font-normal">Guests</th><th className="font-normal">Headcount</th></tr></thead>
                          <tbody>{g.meetings.map((m: Row) => (
                            <tr key={m.event_date} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{fmtDate(m.event_date)}</td><td>{m.present}</td><td>{m.guests ?? ''}</td><td>{m.headcount ?? ''}</td></tr>
                          ))}</tbody></table>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// --------------------------------------------------------------- Serving

export function ServingView() {
  const { data, error, reload } = useChm<{ teams: Row[]; awards: Row[] }>('serving')
  const [open, setOpen] = useState<string | null>(null)
  if (!data) return <Loading error={error} />
  async function add(team: string, id: number) {
    if (await attempt(() => chm('team_member', 'POST', { team_name: team, member_id: id }))) reload()
  }
  async function remove(team: string, id: number, name: string) {
    if (!confirm(`Remove ${name} from ${team}?`)) return
    if (await attempt(() => chm('team_member', 'DELETE', { team_name: team, member_id: id }))) reload()
  }
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      {data.teams.map((t) => {
        const isOpen = open === t.name
        const active = t.members.filter((m: Row) => m.active)
        return (
          <section key={t.name} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button type="button" onClick={() => setOpen(isOpen ? null : t.name)} className="w-full text-left px-4 py-3 flex items-center gap-3">
              <div className="flex-1 font-semibold text-slate-900 dark:text-white">{t.name}</div>
              <Pill>{active.length} serving</Pill>
              {t.last_served && <span className="text-xs text-slate-400 hidden sm:inline">Last served {fmtDate(t.last_served)}</span>}
              <span className="text-slate-400">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-3">
                  {sortByLastName(t.members).map((m: Row) => (
                    <li key={m.id} className="py-1.5 flex items-center gap-2 text-sm">
                      <PersonLink id={m.id} name={m.name} />
                      {m.position && <Pill>{m.position}</Pill>}
                      {!m.active && <Pill tone="amber">inactive</Pill>}
                      <span className="flex-1" />
                      <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => remove(t.name, m.id, m.name)}>Remove</button>
                    </li>
                  ))}
                </ul>
                <PersonPicker onPick={(p) => add(t.name, p.id)} exclude={t.members.map((m: Row) => m.id)} placeholder="Add someone to this team…" />
              </div>
            )}
          </section>
        )
      })}
      <Card title={`Service awards waiting (${data.awards.length})`}>
        {data.awards.length === 0 ? <Empty>No awards are waiting.</Empty> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {data.awards.map((a, i) => (
              <li key={i} className="py-1.5 flex items-center gap-3"><PersonLink id={a.member_id} name={a.name} /><span>{a.label}</span><span className="flex-1" /><span className="text-xs text-slate-400">{a.needed ? 'needs to receive' : 'not marked'}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
