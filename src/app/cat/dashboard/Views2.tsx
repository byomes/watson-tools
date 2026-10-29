'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toolSections } from '@/lib/catTools'
import { EditableRecord } from './PersonProfile'
import { byLastName, sortByLastName } from '@/lib/people'
import {
  Card, ConnBadge, Empty, Loading, Pill, PersonLink, Tabs, btnCls, btnGhost, chm, fmtDate, inputCls, useChm, useNav, usePeople, type Row,
} from './chm'

// ---------------------------------------------------------------- Deacons

const NONE = '__none__'

function downloadCsv(name: string, rows: string[][]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export function DeaconsView() {
  const { data, error, reload } = useChm<Row>('assignments')
  const { refresh } = usePeople()
  const [sel, setSel] = useState<string>(NONE)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [target, setTarget] = useState('')
  const [withHousehold, setWithHousehold] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [naming, setNaming] = useState<'' | 'new' | 'rename'>('')
  const [nameVal, setNameVal] = useState('')

  const everyone: Row[] = useMemo(() => {
    if (!data) return []
    return [...data.unassigned, ...Object.values<Row[]>(data.flocks).flat(), ...Object.values<Row[]>(data.buckets).flat()]
  }, [data])

  const split = useMemo(() => {
    const byHouse: Record<string, Set<string>> = {}
    everyone.forEach((p) => {
      if (!p.household_id || p.role === 'child') return
      ;(byHouse[p.household_id] ??= new Set()).add(p.deacon || 'unassigned')
    })
    return Object.entries(byHouse).filter(([, s]) => s.size > 1).map(([h, s]) => ({ h, deacons: Array.from(s), names: everyone.filter((p) => p.household_id === h).map((p) => p.name) }))
  }, [everyone])

  if (!data) return <Loading error={error} />
  const flocks: Record<string, Row[]> = data.flocks
  const list: Row[] = [...(sel === NONE ? data.unassigned : flocks[sel] ?? data.buckets[sel] ?? [])].sort(byLastName)
  const options = [...data.deacons, ...Object.keys(data.buckets)]

  function toggle(id: number) {
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function apply() {
    let ids = Array.from(picked)
    if (withHousehold) {
      const houses = new Set(everyone.filter((p) => picked.has(p.id) && p.household_id).map((p) => p.household_id))
      ids = Array.from(new Set([...ids, ...everyone.filter((p) => houses.has(p.household_id)).map((p) => p.id)]))
    }
    if (!ids.length || !target) return
    setBusy(true)
    setErr('')
    try {
      await chm('assign', 'POST', { ids, deacon: target === NONE ? '' : target })
      setNote(`Moved ${ids.length} ${ids.length === 1 ? 'person' : 'people'} to ${target === NONE ? 'Unassigned' : target}.`)
      setPicked(new Set())
      reload()
      refresh()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function saveName() {
    const name = nameVal.trim()
    if (!name || (naming === 'rename' && name === sel)) { setNaming(''); return }
    setErr('')
    try {
      if (naming === 'new') await chm('deacon-list-add', 'POST', { name })
      else await chm('deacon-list-rename', 'POST', { name: sel, new_name: name })
      setNaming('')
      reload()
      setSel(name)
      setPicked(new Set())
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    }
  }
  const startNaming = (mode: 'new' | 'rename') => { setErr(''); setNote(''); setNameVal(mode === 'rename' ? sel : ''); setNaming(mode) }

  async function deleteList() {
    if (!window.confirm(`Delete the list "${sel}"? Its ${list.length} ${list.length === 1 ? 'person goes' : 'people go'} back to Unassigned. No one is removed from the database.`)) return
    setErr('')
    try {
      await chm('deacon-list-remove', 'POST', { name: sel })
      setSel(NONE)
      setPicked(new Set())
      reload()
      refresh()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    }
  }

  function exportAll() {
    downloadCsv('deacon-assignments.csv', [['Shepherd', 'Person', 'Connected'], ...everyone.map((p) => [p.deacon || 'Unassigned', p.name, p.connected])])
  }

  const mix = (rows: Row[]) => {
    const c: Record<string, number> = {}
    rows.forEach((r) => { c[r.connected] = (c[r.connected] ?? 0) + 1 })
    return c
  }

  const side = (k: string, label: string, rows: Row[], warn?: boolean) => {
    const m = mix(rows)
    return (
      <button key={k} type="button" onClick={() => { setSel(k); setPicked(new Set()) }}
        className={`w-full text-left rounded-lg px-3 py-2 border ${sel === k ? 'border-slate-900 dark:border-white bg-white dark:bg-slate-900' : 'border-transparent hover:bg-white dark:hover:bg-slate-900'}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">{label}<span className="flex-1" /><Pill tone={warn && rows.length ? 'amber' : 'slate'}>{rows.length}</Pill></div>
        <div className="text-xs text-slate-400 mt-0.5">{Object.entries(m).map(([b, n]) => `${n} ${b}`).join(' · ') || 'no one yet'}</div>
      </button>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Shepherd List</h1>
        <span className="flex-1" />
        <button type="button" className={btnGhost} onClick={() => startNaming('new')}>New list</button>
        {sel !== NONE && !(sel in data.buckets) && <button type="button" className={btnGhost} onClick={() => startNaming('rename')}>Rename list</button>}
        {sel !== NONE && !(sel in data.buckets) && <button type="button" className={btnGhost} onClick={deleteList}>Delete list</button>}
        <button type="button" className={btnGhost} onClick={exportAll}>Download CSV</button>
      </div>
      {naming && (
        <form onSubmit={(e) => { e.preventDefault(); saveName() }} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <label className="text-sm text-slate-700 dark:text-slate-200" htmlFor="deacon-list-name">{naming === 'new' ? 'Name of the new list' : `New name for "${sel}"`}</label>
          <input id="deacon-list-name" autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} maxLength={80} className={`${inputCls} flex-1 min-w-[12rem]`} />
          <button type="submit" className={btnCls} disabled={!nameVal.trim()}>{naming === 'new' ? 'Create list' : 'Rename'}</button>
          <button type="button" className={btnGhost} onClick={() => setNaming('')}>Cancel</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4">
        <div className="flex flex-col gap-1">
          {side(NONE, 'Unassigned', data.unassigned, true)}
          {data.deacons.map((d: string) => side(d, d, flocks[d] ?? []))}
          {Object.keys(data.buckets).map((b) => side(b, b, data.buckets[b]))}
        </div>
        <div className="flex flex-col gap-3">
          <Card title={`${sel === NONE ? 'Unassigned' : sel} (${list.length})`}>
            <div className="flex flex-wrap items-center gap-2 mb-3 sticky top-0 bg-white dark:bg-slate-900 py-1">
              <button type="button" className={btnGhost} onClick={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map((p) => p.id)))}>{picked.size === list.length && list.length ? 'Clear' : 'Select all'}</button>
              <span className="text-xs text-slate-500">{picked.size} selected</span>
              <span className="flex-1" />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={withHousehold} onChange={(e) => setWithHousehold(e.target.checked)} />Move whole household</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls}>
                <option value="">Move to…</option>
                <option value={NONE}>Unassigned</option>
                {options.filter((o) => o !== sel).map((o) => <option key={o}>{o}</option>)}
              </select>
              <button type="button" className={btnCls} disabled={busy || !picked.size || !target} onClick={apply}>{busy ? 'Moving…' : 'Move'}</button>
            </div>
            {err && <p className="text-sm text-red-600 mb-2" role="alert">{err}</p>}
            {note && !err && <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2" role="status">{note}</p>}
            <p className="text-xs text-slate-400 mb-2">Children under 18 are not listed. They follow their household&apos;s shepherd.</p>
            {list.length === 0 ? <Empty>{sel === NONE ? 'Everyone who needs a shepherd has one.' : 'No one here yet. Open Unassigned, tick people, and move them to this list.'}</Empty> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((p) => (
                  <li key={p.id} className="py-1.5 flex items-center gap-3 text-sm">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                    <PersonLink id={p.id} name={p.name} />
                    {p.partner && <Pill tone="blue">partner</Pill>}
                    {p.age != null ? <Pill>age {p.age}</Pill> : p.role === 'child' && <Pill>age unknown</Pill>}
                    <ConnBadge value={p.connected} />
                    {p.status && p.status !== 'active' && <Pill tone="amber">{p.status}</Pill>}
                    <span className="flex-1" />
                    <span className="text-xs text-slate-400">{p.household_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {split.length > 0 && (
            <Card title={`Households split across deacons (${split.length})`}>
              <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {split.map((s) => <li key={s.h} className="py-1.5"><b>{s.names.join(', ')}</b> <span className="text-xs text-slate-400">→ {s.deacons.join(' / ')}</span></li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- Care

export function CareView() {
  const { data, error, reload } = useChm<Row>('care')
  const [tab, setTab] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(true)
  if (!data) return <Loading error={error} />
  const tabs = [
    ...(data.followups ? [{ key: 'followups', label: 'Follow-ups', count: data.followups.filter((f: Row) => f.status === 'open').length }] : []),
    { key: 'prayer', label: 'Prayer', count: data.prayer.length },
    { key: 'next_steps', label: 'Next steps', count: data.next_steps.length },
    { key: 'deacon_notes', label: 'Shepherd notes', count: data.deacon_notes.length },
    { key: 'care_notes', label: 'Care log', count: data.care_notes.length },
  ]
  const active = tab || tabs[0].key
  const cfg: Record<string, { rows: Row[]; kind: string; text: string; date: string; status?: string }> = {
    followups: { rows: data.followups ?? [], kind: 'followup', text: 'note', date: 'created_at', status: 'status' },
    prayer: { rows: data.prayer, kind: 'prayer', text: 'request_text', date: 'date' },
    next_steps: { rows: data.next_steps, kind: 'next_step', text: 'step', date: 'date' },
    deacon_notes: { rows: data.deacon_notes, kind: 'deacon_note', text: 'note', date: 'created_at', status: 'status' },
    care_notes: { rows: data.care_notes, kind: 'care_note', text: 'body', date: 'note_date' },
  }
  const c = cfg[active]
  const rows = c.rows.filter((r) => !(c.status && onlyOpen && r[c.status] !== 'open'))
  return (
    <div className="flex flex-col h-full">
      <Tabs tabs={tabs} active={active} onChange={setTab} />
      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-4xl w-full mx-auto">
        {c.status && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Open items only</label>
        )}
        {rows.length === 0 ? <Empty>Nothing here.</Empty> : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={`${active}-${r.id}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
                  <PersonLink id={r.member_id} name={r.name} className="text-sm" />
                  {fmtDate(r[c.date])} {r.author_deacon ? `· ${r.author_deacon}` : ''} {r.author ? `· ${r.author} · ${r.kind}` : ''}
                  {c.status && <Pill tone={r[c.status] === 'open' ? 'amber' : 'slate'}>{r[c.status]}</Pill>}
                  {r.leadership_only ? <Pill tone="red">leadership only</Pill> : null}
                </div>
                <EditableRecord kind={c.kind} id={r.id} text={r[c.text] ?? ''} date={r[c.date] ?? ''} status={c.status ? r[c.status] : undefined} leadershipOnly={!!r.leadership_only} onChanged={reload}>
                  <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{active === 'next_steps' ? String(r[c.text] ?? '').replace(/_/g, ' ') : String(r[c.text] ?? '')}</p>
                </EditableRecord>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------- Health


function MatchReview() {
  const { data, reload } = useChm<{ matches: Row[] }>('matches')
  const { refresh } = usePeople()
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const rows = data?.matches ?? []

  async function resolve(m: Row, same: boolean) {
    if (!same && !confirm(`Make ${m.submitted_name} a new person and move that card off ${m.member_name}?`)) return
    setBusy(m.id)
    setErr('')
    try {
      await chm(`matches/${m.id}/${same ? 'confirm' : 'different'}`, 'POST')
      reload()
      refresh()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(null)
    }
  }

  const who = (name: string, email?: string, phone?: string) => (
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-900 dark:text-white">{name}</div>
      <div className="text-xs text-slate-500 truncate">{[email, phone].filter(Boolean).join(' · ') || 'no contact info'}</div>
    </div>
  )

  return (
    <Card title="Confirm these matches" action={<Pill tone={rows.length ? 'amber' : 'green'}>{rows.length}</Pill>}>
      <p className="text-xs text-slate-500 mb-2">A connect card came in with a name close to someone we already have, so Watson filed it under them. Is it the same person?</p>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      {rows.length === 0 ? <Empty>Nothing to confirm.</Empty> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((m) => (
            <li key={m.id} className="py-3 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><div className="text-xs text-slate-400 mb-0.5">Card said · {fmtDate(m.service_date)}</div>{who(m.submitted_name, m.submitted_email, m.submitted_phone)}</div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Filed under · {m.member_visits} visits</div>
                  <div className="flex items-center gap-2">{who(m.member_name, m.member_email, m.member_phone)}<PersonLink id={m.member_id} name="Open" className="text-xs !font-normal text-slate-500" /></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnCls} disabled={busy === m.id} onClick={() => resolve(m, true)}>Same person</button>
                <button type="button" className={btnGhost} disabled={busy === m.id} onClick={() => resolve(m, false)}>Different person</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Contact conflicts: two records that may be one person (shared email, same name with another email, alike names).
function ConflictReview() {
  const { data, error, reload } = useChm<{ conflicts: Row[] }>('conflicts')
  const { refresh } = usePeople()
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')
  if (!data) return <Loading error={error} />

  async function act(c: Row, action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(c.id)
    setErr('')
    try {
      await chm('conflict', 'POST', { id: c.id, action })
      reload()
      refresh()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
      reload()
    } finally {
      setBusy(null)
    }
  }

  const stale = data.conflicts.filter((c: Row) => c.existing.gone || c.new.gone).length

  async function clearStale() {
    if (!window.confirm(`Dismiss the ${stale} conflicts where one of the two records has already been merged or deleted? Nothing else changes.`)) return
    setBusy(-1)
    setErr('')
    try {
      await chm('conflict', 'POST', { action: 'dismiss_stale' })
      reload()
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(null)
    }
  }

  const side = (title: string, m: Row) => (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-sm">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{title}</div>
      {m.gone ? (
        <>
          <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
          <div className="text-xs text-red-600 dark:text-red-400">This record no longer exists.</div>
        </>
      ) : (
        <>
          <div className="font-medium"><PersonLink id={m.id} name={m.name} /></div>
          <div className="text-xs text-slate-500 break-all">{m.email || 'no email'}{m.phone ? ` · ${m.phone}` : ''}</div>
          <div className="text-xs text-slate-400">
            {m.visits ? `${m.visits} ${m.visits === 1 ? 'Sunday' : 'Sundays'}, last ${fmtDate(m.last_seen)}` : 'No attendance'}
            {m.first_visit_date ? ` · first ${fmtDate(m.first_visit_date)}` : ''}
            {m.active && m.active !== 'active' ? ` · ${m.active}` : ''}
          </div>
        </>
      )}
    </div>
  )

  return (
    <Card title="Contact conflicts" action={<Pill tone={data.conflicts.length ? 'amber' : 'green'}>{data.conflicts.length}</Pill>}>
      {err && <p className="px-4 text-sm text-red-600 mb-2">{err}</p>}
      {data.conflicts.length === 0 ? <div className="px-4 pb-3"><Empty>None pending.</Empty></div> : (
        <>
          {stale > 0 && (
            <div className="px-4 mb-2 flex flex-wrap items-center gap-2 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">{stale} of these point at a record that was already merged or deleted.</span>
              <button type="button" className={btnGhost} disabled={busy === -1} onClick={clearStale}>Dismiss those {stale}</button>
            </div>
          )}
          <p className="px-4 text-xs text-slate-500 mb-2">Two records that might be the same person. If they are, pick the one to keep: the other is folded into it, its history moves over, and its name is remembered so it will not come back. Click a name to fix details on the profile first.</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.conflicts.map((c: Row) => {
              const gone = c.existing.gone || c.new.gone
              return (
                <li key={c.id} className="px-4 py-3 flex flex-col gap-2">
                  <div className="text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-300">{c.label}</b> · found {fmtDate(c.detected_at)}{c.notes ? ` · ${c.notes}` : ''}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{side('On file', c.existing)}{side('Newer record', c.new)}</div>
                  <div className="flex flex-wrap gap-2">
                    {!gone && (
                      <>
                        <button type="button" className={btnCls} disabled={busy === c.id}
                          onClick={() => act(c, 'keep_existing', `Same person. Keep "${c.existing.name}" and fold "${c.new.name}" into it? This cannot be undone.`)}>Same person: keep {c.existing.name}</button>
                        <button type="button" className={btnCls} disabled={busy === c.id}
                          onClick={() => act(c, 'keep_new', `Same person. Keep "${c.new.name}" and fold "${c.existing.name}" into it? This cannot be undone.`)}>Same person: keep {c.new.name}</button>
                      </>
                    )}
                    <button type="button" className={btnGhost} disabled={busy === c.id} onClick={() => act(c, 'different')}>Two different people</button>
                    <button type="button" className={btnGhost} disabled={busy === c.id} onClick={() => act(c, 'dismiss')}>Dismiss</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}

export function HealthView() {
  const { go } = useNav()
  const { data, error } = useChm<Row>('health')
  const [open, setOpen] = useState<string | null>(null)
  if (!data) return <Loading error={error} />
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-3">
      <MatchReview />
      <p className="text-sm text-slate-500">Gaps in the records, for active people only. Click a name to fix it on their profile.</p>
      {Object.entries<Row[]>(data.missing).map(([label, rows]) => (
        <Card key={label} title={label} action={<Pill tone={rows.length ? 'amber' : 'green'}>{rows.length}</Pill>}>
          {rows.length === 0 ? <Empty>All good.</Empty> : (
            <>
              <button type="button" className="text-xs text-slate-500 hover:underline mb-1" onClick={() => setOpen(open === label ? null : label)}>{open === label ? 'Hide list' : 'Show list'}</button>
              {open === label && (
                <ul className="columns-1 sm:columns-2 text-sm">{sortByLastName(rows).map((r) => <li key={r.id} className="py-0.5"><PersonLink id={r.id} name={r.name} /></li>)}</ul>
              )}
            </>
          )}
        </Card>
      ))}
      <Card title="Possible duplicate people" action={<button type="button" className={btnGhost} onClick={() => go('tool/cat/duplicates')}>Review and merge</button>}>
        {data.duplicates.length === 0 ? <Empty>None pending.</Empty> : (
          <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
            {data.duplicates.slice(0, 15).map((d: Row) => (
              <li key={d.id} className="py-1.5"><PersonLink id={d.member_id_a} name={d.name_a ?? '?'} /> <span className="text-slate-400">and</span> <PersonLink id={d.member_id_b} name={d.name_b ?? '?'} /> <span className="text-xs text-slate-400">{d.reason}</span></li>
            ))}
            {data.duplicates.length > 15 && <li className="py-1.5 text-xs text-slate-400">+{data.duplicates.length - 15} more in the review tool</li>}
          </ul>
        )}
      </Card>
      <ConflictReview />
    </div>
  )
}

// ------------------------------------------------------------------ Tools

export function ToolsView({ href, admin = false }: { href: string; admin?: boolean }) {
  const { go } = useNav()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const sendTheme = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'cat-theme', dark: document.documentElement.classList.contains('dark') }, window.location.origin)
  }, [])
  useEffect(() => {
    const mo = new MutationObserver(sendTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onMsg = (e: MessageEvent) => e.origin === window.location.origin && e.data?.type === 'cat-theme-request' && sendTheme()
    window.addEventListener('message', onMsg)
    return () => { mo.disconnect(); window.removeEventListener('message', onMsg) }
  }, [sendTheme])

  if (href) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><button type="button" onClick={() => go(admin ? 'admin' : 'tools')} className="text-xs text-slate-500 hover:underline">{admin ? '← All admin' : '← All tools'}</button></div>
        <iframe ref={frameRef} key={href} src={href} onLoad={sendTheme} className="flex-1 w-full border-0 bg-white dark:bg-slate-950" title="Tool" />
      </div>
    )
  }
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      {toolSections(admin).map((sec) => (
        <div key={sec.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{sec.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sec.tools.flatMap((t) => (t.children ? [t, ...t.children.filter((c) => c.href !== t.href)] : [t])).map((t) => (
              <button key={t.href + t.name} type="button" onClick={() => go('tool' + t.href)} className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:border-slate-400 dark:hover:border-slate-600">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name}</div>
                <div className="text-xs text-slate-500">{t.note}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}


/** A page of the 9e9 app (the product itself) shown inside the dashboard. It signs the person in automatically and follows the dashboard's light/dark setting. */
export function NineFrame({ src }: { src: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const sendTheme = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'cat-theme', dark: document.documentElement.classList.contains('dark') }, window.location.origin)
  }, [])
  useEffect(() => {
    const mo = new MutationObserver(sendTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onMsg = (e: MessageEvent) => e.origin === window.location.origin && e.data?.type === 'cat-theme-request' && sendTheme()
    window.addEventListener('message', onMsg)
    return () => { mo.disconnect(); window.removeEventListener('message', onMsg) }
  }, [sendTheme])
  return <iframe ref={frameRef} src={src} onLoad={sendTheme} className="h-full w-full border-0 bg-slate-50 dark:bg-slate-950" title="9e9" />
}
