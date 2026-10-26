'use client'

import { useMemo, useState } from 'react'
import CatalystDBBoard, { type BoardSpec } from '../catalystdb/(gated)/CatalystDBBoard'
import {
  Card, ConnBadge, Empty, Loading, Pill, PersonLink, PersonPicker, btnCls, btnGhost, chm, fmtDate, ago, inputCls,
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

function TrendChart({ trend }: { trend: Row[] }) {
  const byDate = useMemo(() => {
    const m: Record<string, number> = {}
    trend.forEach((t) => { m[t.service_date] = (m[t.service_date] ?? 0) + t.n })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
  }, [trend])
  const max = Math.max(1, ...byDate.map(([, n]) => n))
  if (!byDate.length) return <Empty>No attendance yet.</Empty>
  return (
    <div className="flex items-end gap-1.5 h-32">
      {byDate.map(([d, n]) => (
        <div key={d} className="flex-1 h-full flex flex-col items-center justify-end gap-1" title={`${fmtDate(d)}: ${n}`}>
          <span className="text-[10px] text-slate-500">{n}</span>
          <div className="w-full rounded-t bg-slate-800 dark:bg-slate-200" style={{ height: `${(n / max) * 100}%`, minHeight: 2 }} />
          <span className="text-[10px] text-slate-400">{d.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export function HomeView() {
  const { go } = useNav()
  const { data: s, error } = useChm<Row>('summary')
  if (!s) return <Loading error={error} />
  const total = Object.values(s.connected as Record<string, number>).reduce((a, b) => a + b, 0) || 1
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-5">
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
        <Card title="Attendance, last 12 weeks"><TrendChart trend={s.trend} /></Card>
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
    await chm('views', 'POST', { name: name.trim(), spec: current, shared: true })
    setName('')
    setNaming(false)
    reload()
  }
  async function del(v: SavedView) {
    if (!confirm(`Delete the saved view "${v.name}"?`)) return
    await chm(`views/${v.id}`, 'DELETE')
    reload()
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
        {shown.map((k) => (
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
    await chm(`kid/${id}`, 'PATCH', { first_name: d.first_name, last_name: d.last_name, gender: d.gender ?? '', current_class: d.current_class ?? '', current_class_9am: d.current_class_9am ?? '', household_id: d.household_id ?? '' })
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
      <Card title="Family">
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
    await chm('roster', 'POST', { series: g.key, member_id: id })
    reload()
  }
  async function remove(g: Row, id: number, name: string) {
    if (!confirm(`Remove ${name} from ${g.name}?`)) return
    await chm('roster', 'DELETE', { series: g.key, member_id: id })
    reload()
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
                {isOpen && (
                  <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Roster</h3>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-3">
                        {g.members.map((m: Row) => (
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
    await chm('team_member', 'POST', { team_name: team, member_id: id })
    reload()
  }
  async function remove(team: string, id: number, name: string) {
    if (!confirm(`Remove ${name} from ${team}?`)) return
    await chm('team_member', 'DELETE', { team_name: team, member_id: id })
    reload()
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
                  {t.members.map((m: Row) => (
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
