'use client'

import { useMemo, useState } from 'react'
import MemberDetail from '../catalystdb/(gated)/MemberDetail'
import {
  Card, ConnBadge, Empty, Loading, Pill, PersonLink, PersonPicker, Tabs, btnCls, btnGhost, attempt, chm, fmtDate, ago, inputCls,
  useChm, useNav, usePeople, type Row,
} from './chm'
import { notifyDssChanged } from '@/lib/dssSync'

// One person, everything about them. Tabs: Timeline (merged history, editable), Details (the
// member fields), Attendance, Cards & Care, Family, Involvement, Record.

const TYPE_META: Record<string, { label: string; dot: string; kind?: string }> = {
  attendance: { label: 'Attendance', dot: 'bg-emerald-500' },
  card: { label: 'Connect cards', dot: 'bg-sky-500', kind: 'card' },
  prayer: { label: 'Prayer', dot: 'bg-violet-500', kind: 'prayer' },
  next_step: { label: 'Next steps', dot: 'bg-teal-500', kind: 'next_step' },
  followup: { label: 'Follow-ups', dot: 'bg-amber-500', kind: 'followup' },
  deacon_note: { label: 'Shepherd notes', dot: 'bg-orange-500', kind: 'deacon_note' },
  care: { label: 'Care log', dot: 'bg-rose-500', kind: 'care_note' },
  group: { label: 'Groups', dot: 'bg-indigo-500' },
  serving: { label: 'Serving', dot: 'bg-lime-600' },
  kids: { label: 'Kids check-in', dot: 'bg-pink-500' },
  award: { label: 'Awards', dot: 'bg-yellow-500' },
  role: { label: 'Roles', dot: 'bg-slate-500' },
  edit: { label: 'Edits', dot: 'bg-slate-400' },
}

const NOTE_KINDS = ['note', 'call', 'visit', 'text', 'email', 'prayer', 'meeting']

// A history record you can fix or remove: text, date, and (for follow-ups and deacon notes) status.
export function EditableRecord({ kind, id, text, date, status, leadershipOnly, onChanged, children }: {
  kind: string
  id: number
  text: string
  date: string
  status?: string
  leadershipOnly?: boolean
  onChanged: () => void
  children: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [t, setT] = useState(text)
  const [d, setD] = useState((date || '').slice(0, 10))
  const [s, setS] = useState(status ?? '')
  const [lo, setLo] = useState(!!leadershipOnly)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setBusy(true)
    setErr('')
    try {
      const body: Row = { text: t, date: d }
      if (status !== undefined) body.status = s
      if (kind === 'prayer') body.leadership_only = lo
      await chm(`history/${kind}/${id}`, 'PATCH', body)
      setEditing(false)
      onChanged()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!confirm('Delete this record? This cannot be undone.')) return
    try {
      await chm(`history/${kind}/${id}`, 'DELETE')
      onChanged()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    }
  }

  if (!editing) {
    return (
      <div className="group">
        {children}
        <div className="mt-1 flex gap-3 text-xs text-slate-400">
          <button type="button" onClick={() => setEditing(true)} className="hover:text-slate-900 dark:hover:text-white">Edit</button>
          <button type="button" onClick={remove} className="hover:text-red-600">Delete</button>
          {err && <span className="text-red-600">{err}</span>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={3} className={`${inputCls} w-full`} />
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} className={inputCls} />
        {status !== undefined && (
          <select value={s} onChange={(e) => setS(e.target.value)} className={inputCls}>
            {['open', 'closed', 'dismissed'].map((x) => <option key={x}>{x}</option>)}
          </select>
        )}
        {kind === 'prayer' && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={lo} onChange={(e) => setLo(e.target.checked)} /> Leadership only
          </label>
        )}
        <span className="flex-1" />
        <button type="button" className={btnGhost} onClick={() => setEditing(false)}>Cancel</button>
        <button type="button" className={btnCls} disabled={busy || !t.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

function AddRecord({ memberId, onAdded }: { memberId: number; onAdded: () => void }) {
  const [kind, setKind] = useState('care:note')
  const [text, setText] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lo, setLo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    setBusy(true)
    setErr('')
    try {
      const [group, sub] = kind.split(':')
      if (group === 'care') await chm('care_note', 'POST', { member_id: memberId, body: text, kind: sub, note_date: date })
      else await chm(`history/${group}`, 'POST', { member_id: memberId, text, date, leadership_only: lo })
      setText('')
      setLo(false)
      onAdded()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col gap-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Add a note, call, visit, prayer request, next step…" className={`${inputCls} w-full`} />
      <div className="flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
          <optgroup label="Care log">
            {NOTE_KINDS.map((k) => <option key={k} value={`care:${k}`}>{k[0].toUpperCase() + k.slice(1)}</option>)}
          </optgroup>
          <optgroup label="Other records">
            <option value="prayer">Prayer request</option>
            <option value="next_step">Next step</option>
            <option value="deacon_note">Shepherd note</option>
            <option value="followup">Follow-up</option>
          </optgroup>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        {kind === 'prayer' && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={lo} onChange={(e) => setLo(e.target.checked)} /> Leadership only
          </label>
        )}
        <span className="flex-1" />
        <button type="button" className={btnCls} disabled={busy || !text.trim()} onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

function Timeline({ p, reload }: { p: Row; reload: () => void }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(['edit']))
  const [limit, setLimit] = useState(60)
  const present = useMemo(() => Array.from(new Set<string>(p.timeline.map((e: Row) => e.type))), [p.timeline])
  const items = p.timeline.filter((e: Row) => !hidden.has(e.type))
  const counts: Record<string, number> = {}
  p.timeline.forEach((e: Row) => { counts[e.type] = (counts[e.type] ?? 0) + 1 })

  return (
    <div className="flex flex-col gap-3">
      <AddRecord memberId={p.member.id} onAdded={reload} />
      <div className="flex flex-wrap gap-1.5">
        {present.map((t) => {
          const on = !hidden.has(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => setHidden((h) => { const n = new Set(h); if (on) n.add(t); else n.delete(t); return n })}
              className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-100' : 'border-slate-200 dark:border-slate-800 text-slate-400 line-through'}`}
            >
              <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${TYPE_META[t]?.dot ?? 'bg-slate-400'}`} />
              {TYPE_META[t]?.label ?? t} {counts[t]}
            </button>
          )
        })}
      </div>
      {items.length === 0 ? <Empty>Nothing to show.</Empty> : (
        <ol className="flex flex-col">
          {items.slice(0, limit).map((e: Row, i: number) => {
            const meta = TYPE_META[e.type]
            const body = (
              <div>
                <div className="text-sm text-slate-900 dark:text-white">{e.title}{e.status && e.type === 'followup' ? '' : ''}</div>
                {e.detail && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{e.detail}</p>}
              </div>
            )
            return (
              <li key={`${e.type}-${e.ref ?? i}-${i}`} className="flex gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex flex-col items-center pt-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta?.dot ?? 'bg-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 mb-0.5">{fmtDate(e.date)}</div>
                  {e.editable && meta?.kind ? (
                    <EditableRecord
                      kind={meta.kind}
                      id={e.ref}
                      text={e.detail || (e.type === 'next_step' ? e.title.replace('Next step: ', '') : '')}
                      date={e.date}
                      status={e.type === 'followup' || e.type === 'deacon_note' ? e.status ?? 'open' : undefined}
                      leadershipOnly={e.title.includes('leadership only')}
                      onChanged={reload}
                    >
                      {body}
                    </EditableRecord>
                  ) : body}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {items.length > limit && <button type="button" className={btnGhost} onClick={() => setLimit((l) => l + 100)}>Show more ({items.length - limit} left)</button>}
    </div>
  )
}

// Weekly attendance strip: one cell per week for the last 52 weeks.
function AttendanceTab({ p }: { p: Row }) {
  const dates: string[] = p.attendance.map((a: Row) => a.service_date)
  const weeks = useMemo(() => {
    const set = new Set(dates)
    const out: { label: string; hit: boolean }[] = []
    const today = new Date()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay())
    for (let i = 51; i >= 0; i--) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() - i * 7)
      const iso = d.toISOString().slice(0, 10)
      const hit = Array.from({ length: 7 }).some((_, k) => {
        const x = new Date(d)
        x.setDate(d.getDate() + k)
        return set.has(x.toISOString().slice(0, 10))
      })
      out.push({ label: iso, hit })
    }
    return out
  }, [dates])
  const s = p.stats
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total visits', s.total],
          ['Last 8 weeks', s.last_8_weeks],
          ['Last seen', s.last_seen ? ago(s.last_seen) : 'never'],
          ['First seen', s.first_seen ? fmtDate(s.first_seen) : 'never'],
        ].map(([k, v]) => (
          <Card key={String(k)}><div className="text-xs text-slate-500">{k}</div><div className="text-lg font-semibold text-slate-900 dark:text-white">{v}</div></Card>
        ))}
      </div>
      <Card title="Last 52 weeks">
        <div className="flex gap-0.5 flex-wrap">
          {weeks.map((w) => (
            <span key={w.label} title={w.label} className={`h-5 w-3 rounded-sm ${w.hit ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Connected status: regular = 6+ visits in 8 weeks. At risk = 14 to 27 days since last visit after being regular; critical = 28 to 62 days; disconnected = 63+.
        </p>
      </Card>
      <Card title="Recent services">
        {p.attendance.length === 0 ? <Empty>No attendance on file.</Empty> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
            {p.attendance.slice(0, 30).map((a: Row) => (
              <li key={a.service_date} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>{fmtDate(a.service_date)}</span><span className="text-slate-400">{a.campus}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Records({ title, rows, kind, text, date, status, reload }: { title: string; rows: Row[]; kind: string; text: string; date: string; status?: string; reload: () => void }) {
  return (
    <Card title={`${title} (${rows.length})`}>
      {rows.length === 0 ? <Empty>None.</Empty> : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
              <EditableRecord kind={kind} id={r.id} text={r[text] ?? ''} date={r[date] ?? ''} status={status ? r[status] : undefined} leadershipOnly={!!r.leadership_only} onChanged={reload}>
                <div className="text-xs text-slate-400 mb-0.5">
                  {fmtDate(r[date])} {r.author_deacon ? `· ${r.author_deacon}` : ''} {r.author ? `· ${r.author} · ${r.kind}` : ''} {status && r[status] ? <Pill tone={r[status] === 'open' ? 'amber' : 'slate'}>{r[status]}</Pill> : null} {r.leadership_only ? <Pill tone="red">leadership only</Pill> : null}
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{(r[text] ?? '').replace(/_/g, ' ')}</p>
              </EditableRecord>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function CareTab({ p, reload }: { p: Row; reload: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <AddRecord memberId={p.member.id} onAdded={reload} />
      <Records title="Follow-ups" rows={p.followups} kind="followup" text="note" date="created_at" status="status" reload={reload} />
      <Records title="Care log" rows={p.care_notes} kind="care_note" text="body" date="note_date" reload={reload} />
      <Records title="Prayer requests" rows={p.prayer} kind="prayer" text="request_text" date="date" reload={reload} />
      <Records title="Next steps" rows={p.next_steps} kind="next_step" text="step" date="date" reload={reload} />
      <Records title="Shepherd notes" rows={p.deacon_notes} kind="deacon_note" text="note" date="created_at" status="status" reload={reload} />
      <Records title="Connect cards" rows={p.cards} kind="card" text="questions_comments" date="service_date" reload={reload} />
    </div>
  )
}

const HOUSEHOLD_ROLES = ['head', 'husband', 'wife', 'widow', 'widower', 'child', 'young adult']

function FamilyTab({ p, reload }: { p: Row; reload: () => void }) {
  const { go } = useNav()
  const [addRole, setAddRole] = useState('child')
  const me: number = p.member.id
  const kids: Row[] = p.kids
  const kidOf = (memberId: number) => kids.find((k) => k.member_id === memberId)
  // Check-in kids with no member row in this household still get a line of their own.
  const shown = new Set<number>([me, ...p.household.map((h: Row) => h.id)])
  const kidsOnly = kids.filter((k) => !k.member_id || !shown.has(k.member_id))

  async function edit(body: Row) {
    if (await attempt(() => chm('household', 'POST', body))) reload()
  }
  async function add(other: { id: number; name: string }) {
    const body = { action: 'add', member_id: me, other_id: other.id, role: addRole }
    try {
      await chm('household', 'POST', body)
    } catch (e) {
      const msg = String((e as Error).message ?? e)
      if (!msg.includes('Confirm to move')) return void attempt(() => Promise.reject(e))
      if (!confirm(msg)) return
      if (!(await attempt(() => chm('household', 'POST', { ...body, move: true })))) return
    }
    reload()
  }
  // A person who is also a check-in kid is removed through the kid row, which keeps both records in step.
  async function remove(name: string, memberId: number | null, kid?: Row) {
    if (!confirm(`Remove ${name} from this household? Their record stays; only the household link is cleared.`)) return
    if (kid) {
      if (await attempt(() => chm(`kid/${kid.id}`, 'PATCH', { household_id: '' }))) reload()
    } else if (memberId !== null) edit({ action: 'remove', member_id: memberId })
  }
  const roleSelect = (id: number, value: string) => (
    <select value={value} onChange={(e) => edit({ action: 'role', member_id: id, role: e.target.value })} className={`${inputCls} !py-1 text-xs`} aria-label="Household role">
      <option value="">role not set</option>
      {HOUSEHOLD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
  )
  const roleOf = (h: Row) => (h.household_role && h.household_role !== '--' ? h.household_role : '')

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Household ${p.member.household_id ? `(${p.member.household_id})` : ''}`}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          <FamilyRow
            name={<span className="font-medium text-slate-900 dark:text-white">{p.member.name} (this person)</span>}
            role={roleSelect(me, roleOf(p.member))}
            kid={kidOf(me)}
            onRemove={p.member.household_id ? () => remove(p.member.name, me, kidOf(me)) : undefined}
            removeLabel="Leave household"
            onChanged={reload}
          />
          {p.household.map((h: Row) => (
            <FamilyRow
              key={h.id}
              name={<PersonLink id={h.id} name={h.name} />}
              role={roleSelect(h.id, roleOf(h))}
              extra={h.phone || h.email || ''}
              kid={kidOf(h.id)}
              onRemove={() => remove(h.name, h.id, kidOf(h.id))}
              onChanged={reload}
            />
          ))}
          {kidsOnly.map((k) => (
            <FamilyRow
              key={`kid${k.id}`}
              name={<button type="button" onClick={() => go(`kid/${k.id}`)} className="font-medium text-slate-900 dark:text-white hover:underline">{k.first_name} {k.last_name}</button>}
              role={<Pill>child</Pill>}
              kid={k}
              onRemove={() => remove(`${k.first_name} ${k.last_name}`, null, k)}
              onChanged={reload}
            />
          ))}
        </ul>
        {p.household.length === 0 && kidsOnly.length === 0 && <Empty>No one else in this household.</Empty>}
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex-1"><PersonPicker onPick={add} placeholder="Add a person to this household…" exclude={[me, ...p.household.map((h: Row) => h.id)]} /></div>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value)} className={`${inputCls} text-sm`} aria-label="Role for the person being added">
              {HOUSEHOLD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {p.member.household_id ? (
            <KidPicker householdId={p.member.household_id} exclude={kids.map((k) => k.id)} onAdded={reload} />
          ) : (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => edit({ action: 'create', member_id: me })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Make household</button>
              <p className="text-xs text-slate-400">Gives {p.member.name} a household number now, or add someone above to start one together.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// One line of the household. If the person is also a check-in kid, their class pills and a class/name editor ride on the line.
function FamilyRow({ name, role, extra, kid, onRemove, removeLabel = 'Remove', onChanged }: {
  name: React.ReactNode
  role: React.ReactNode
  extra?: string
  kid?: Row
  onRemove?: () => void
  removeLabel?: string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState({ first_name: kid?.first_name ?? '', last_name: kid?.last_name ?? '', current_class: kid?.current_class ?? '', current_class_9am: kid?.current_class_9am ?? '' })

  async function save() {
    if (kid && (await attempt(() => chm(`kid/${kid.id}`, 'PATCH', d)))) {
      setEditing(false)
      onChanged()
    }
  }
  const f = (key: keyof typeof d, label: string) => (
    <input value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} placeholder={label} aria-label={label} className={`${inputCls} text-sm`} />
  )
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {name}
        {role}
        {kid?.current_class && <Pill tone="blue">{kid.current_class}</Pill>}
        {kid?.current_class_9am && <Pill tone="blue">9 AM: {kid.current_class_9am}</Pill>}
        {extra && <span className="text-xs text-slate-400 truncate">{extra}</span>}
        <span className="ml-auto flex gap-3 text-xs">
          {kid && <button type="button" onClick={() => setEditing(!editing)} className="text-sky-600 hover:underline">{editing ? 'Close' : 'Edit classes'}</button>}
          {onRemove && <button type="button" onClick={onRemove} className="text-red-600 hover:underline">{removeLabel}</button>}
        </span>
      </div>
      {editing && kid && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {f('first_name', 'First name')}{f('last_name', 'Last name')}{f('current_class', '10 AM class')}{f('current_class_9am', '9 AM class')}
          <div className="col-span-2 flex gap-2">
            <button type="button" onClick={save} className={btnCls}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  )
}

function KidPicker({ householdId, exclude, onAdded }: { householdId: string; exclude: number[]; onAdded: () => void }) {
  const { data } = useChm<{ kids: Row[] }>('kids')
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (n.length < 2) return []
    return (data?.kids ?? []).filter((k) => !exclude.includes(k.id) && `${k.first_name} ${k.last_name}`.toLowerCase().includes(n)).slice(0, 8)
  }, [q, data, exclude])

  async function add(k: Row) {
    if (k.household_id && !confirm(`${k.first_name} ${k.last_name} is linked to another household${k.parents?.length ? ` (${k.parents.join(', ')})` : ''}. Move them here?`)) return
    if (await attempt(() => chm(`kid/${k.id}`, 'PATCH', { household_id: householdId }))) {
      setQ('')
      onAdded()
    }
  }
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Link a kid from check-in…" className={`${inputCls} w-full`} />
      {matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-64 overflow-auto">
          {matches.map((k) => (
            <li key={k.id}>
              <button type="button" onClick={() => add(k)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white">
                {k.first_name} {k.last_name} <span className="text-xs text-slate-400">{k.parents?.length ? k.parents.join(', ') : k.household_id ? k.household_id : 'no household'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InvolvementTab({ p, reload }: { p: Row; reload: () => void }) {
  const [team, setTeam] = useState('')
  const [pos, setPos] = useState('')
  const { data: serving } = useChm<{ teams: Row[] }>('serving')
  const names = (serving?.teams ?? []).map((t) => t.name)

  async function mut(method: 'POST' | 'DELETE', team_name: string, position = '') {
    if (await attempt(() => chm('team_member', method, { member_id: p.member.id, team_name, position }))) reload()
  }
  async function groupMut(method: 'POST' | 'DELETE', series: string) {
    if (await attempt(() => chm('roster', method, { member_id: p.member.id, series }))) reload()
  }
  const { data: groups } = useChm<{ groups: Row[] }>('groups')
  const [grp, setGrp] = useState('')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title={`Serving teams (${p.teams.filter((t: Row) => t.active).length})`}>
        {p.teams.length === 0 ? <Empty>Not on a team.</Empty> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {p.teams.map((t: Row) => (
              <li key={t.id} className="py-2 flex items-center gap-2 text-sm">
                <span className="text-slate-900 dark:text-white">{t.team_name}</span>
                {t.position && <Pill>{t.position}</Pill>}
                {!t.active && <Pill tone="amber">inactive</Pill>}
                <span className="flex-1" />
                <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => confirm(`Remove from ${t.team_name}?`) && mut('DELETE', t.team_name)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={inputCls}>
            <option value="">Add to a team…</option>
            {names.map((n) => <option key={n}>{n}</option>)}
          </select>
          <input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="Role (optional)" className={`${inputCls} w-36`} />
          <button type="button" className={btnCls} disabled={!team} onClick={() => { mut('POST', team, pos); setTeam(''); setPos('') }}>Add</button>
        </div>
      </Card>
      <Card title={`Groups (${p.groups.length})`}>
        {p.groups.length === 0 ? <Empty>Not on a group roster.</Empty> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {p.groups.map((g: Row) => (
              <li key={g.series} className="py-2 flex items-center text-sm">
                <span className="text-slate-900 dark:text-white">{g.series.split('|').pop()}</span>
                {p.leads.some((l: Row) => g.series.endsWith('|' + l.title)) && <span className="ml-2"><Pill tone="blue">leader</Pill></span>}
                <span className="flex-1" />
                <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => confirm('Remove from this group?') && groupMut('DELETE', g.series)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <select value={grp} onChange={(e) => setGrp(e.target.value)} className={inputCls}>
            <option value="">Add to a group…</option>
            {(groups?.groups ?? []).map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
          </select>
          <button type="button" className={btnCls} disabled={!grp} onClick={() => { groupMut('POST', grp); setGrp('') }}>Add</button>
        </div>
      </Card>
      <Card title="Leadership roles">
        {p.roles.length === 0 ? <Empty>None.</Empty> : <div className="flex flex-wrap gap-1.5">{p.roles.map((r: Row) => <Pill key={r.id} tone={r.is_active ? 'blue' : 'slate'}>{r.role}</Pill>)}</div>}
      </Card>
      <Card title="Service awards">
        {p.awards.length === 0 ? <Empty>No milestones yet.</Empty> : (
          <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
            {p.awards.map((a: Row) => (
              <li key={a.id} className="py-1.5 flex justify-between">
                <span>{a.label}</span>
                <span className="text-slate-400">{a.received ? `received ${fmtDate(a.received_date)}` : a.needed ? 'needs to receive' : 'not marked'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function RecordTab({ p }: { p: Row }) {
  const m = p.member
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Names">
        {p.aliases.length === 0 ? <Empty>No alternate names.</Empty> : <div className="flex flex-wrap gap-1.5">{p.aliases.map((a: Row) => <Pill key={a.id}>{a.alias}</Pill>)}</div>}
      </Card>
      <Card title="Possible duplicates">
        {p.duplicates.length === 0 ? <Empty>None flagged.</Empty> : (
          <ul className="text-sm">{p.duplicates.map((d: Row) => <li key={d.id} className="py-1"><PersonLink id={d.other_id} name={d.other_name} /> <span className="text-xs text-slate-400">{d.reason}</span></li>)}</ul>
        )}
      </Card>
      <Card title="Record">
        <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-500">Member ID</dt><dd>{m.id}</dd>
          <dt className="text-slate-500">Created</dt><dd>{m.created_at}</dd>
          <dt className="text-slate-500">Updated</dt><dd>{m.updated_at}</dd>
          <dt className="text-slate-500">Connected override</dt><dd>{m.connected_override || 'none (computed from attendance)'}</dd>
        </dl>
      </Card>
    </div>
  )
}

export default function PersonProfile({ id, tab, setTab, onBack }: { id: number; tab: string; setTab: (t: string) => void; onBack: () => void }) {
  const { data: p, error, reload } = useChm<Row>(`person/${id}`)
  const { refresh } = usePeople()
  const [assigning, setAssigning] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  if (!p) return <Loading error={error} />
  const m = p.member

  async function saveFields(changes: Record<string, string | number>) {
    setSaveErr('')
    try {
      await Promise.all(Object.entries(changes).map(async ([field, value]) => {
        const res = await fetch('/api/cat/catalystdb/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], field, value }) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not save')
      }))
      notifyDssChanged()
      refresh()
      reload()
    } catch (e) {
      setSaveErr(String((e as Error).message ?? e))
    }
  }

  async function setDeacon(name: string) {
    if (!(await attempt(() => chm('assign', 'POST', { ids: [id], deacon: name })))) return
    setAssigning(false)
    refresh()
    reload()
  }

  async function deactivate() {
    if (!confirm('Deactivate this member? This can be undone by re-activating.')) return
    const ok = await attempt(async () => {
      const res = await fetch('/api/cat/catalystdb/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not deactivate')
    })
    if (!ok) return
    notifyDssChanged()
    refresh()
    reload()
  }

  async function deletePermanently() {
    if (!confirm(`Permanently delete ${m.name ?? `#${id}`}? This cannot be undone.`)) return
    const ok = await attempt(async () => {
      const res = await fetch('/api/cat/catalystdb/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not delete')
    })
    if (!ok) return
    notifyDssChanged()
    refresh()
    onBack()
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'attendance', label: 'Attendance', count: p.stats.total },
    { key: 'care', label: 'Cards & Care', count: p.cards.length + p.prayer.length + p.followups.length + p.care_notes.length + p.deacon_notes.length },
    { key: 'family', label: 'Household', count: p.household.length + p.kids.filter((k: Row) => !k.member_id || (k.member_id !== p.member.id && !p.household.some((h: Row) => h.id === k.member_id))).length },
    { key: 'involvement', label: 'Involvement', count: p.teams.length + p.groups.length },
    { key: 'record', label: 'Record' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 pt-3 pb-3">
        <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1">← People</button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{m.name}</h1>
          <ConnBadge value={m.connected} />
          {m.partner === 'partner' && <Pill tone="blue">partner</Pill>}
          {m.active && m.active !== 'active' && <Pill tone="amber">{m.active}</Pill>}
          {m.household_role && <Pill>{m.household_role}</Pill>}
          <span className="flex-1" />
          <div className="relative">
            <button type="button" onClick={() => setAssigning((v) => !v)} className={btnGhost}>
              Shepherd: {m.deacon && m.deacon !== '--' ? m.deacon : 'unassigned'} ▾
            </button>
            {assigning && (
              <ul className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-72 overflow-auto">
                {[...p.deacon_options, ''].map((d: string) => (
                  <li key={d || 'none'}>
                    <button type="button" onClick={() => setDeacon(d)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white">
                      {d || 'Unassigned'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
          {m.phone && <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>}
          {m.email && <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>}
          {m.address && <span>{m.address}</span>}
          {m.birthdate && <span>Born {fmtDate(m.birthdate)}</span>}
          <span className="text-slate-400">Last seen {p.stats.last_seen ? ago(p.stats.last_seen) : 'never'}</span>
        </div>
      </div>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="flex-1 overflow-auto">
        {tab === 'details' ? (
          <div className="max-w-4xl mx-auto">
            {saveErr && <p className="px-5 pt-3 text-sm text-red-600">{saveErr}</p>}
            <MemberDetail embedded member={m} teamNames={(p.teams as Row[]).map((t) => t.team_name)} onClose={() => {}} onSave={saveFields} onDeactivate={deactivate} onDelete={deletePermanently} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
            {tab === 'timeline' && <Timeline p={p} reload={reload} />}
            {tab === 'attendance' && <AttendanceTab p={p} />}
            {tab === 'care' && <CareTab p={p} reload={reload} />}
            {tab === 'family' && <FamilyTab p={p} reload={reload} />}
            {tab === 'involvement' && <InvolvementTab p={p} reload={reload} />}
            {tab === 'record' && <RecordTab p={p} />}
          </div>
        )}
      </div>
    </div>
  )
}
