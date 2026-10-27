'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import BoardReport, { Bars, ForecastChart, TrendChart, type BoardData } from './BoardReport'
import { monthLabel, pct, shiftMonth, thisMonth, usd } from './fmt'

type Json = Record<string, any>

async function api<T = Json>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/fmsmoney/${path}`, {
    method,
    headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

function useData<T = Json>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path).then((d) => { if (live) { setData(d); setError('') } }).catch((e) => live && setError(String(e.message ?? e)))
    return () => { live = false }
  }, [path, tick])
  return { data, error, reload: () => setTick((t) => t + 1) }
}

const card = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4'
const btn = 'rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-semibold disabled:opacity-50'
const ghost = 'rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50'
const field = 'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm'

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const t = tone === 'bad' ? 'text-red-600 dark:text-red-400' : tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : ''
  return (
    <div className={card}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${t}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Loading({ error }: { error?: string }) {
  return <div className="p-6 text-sm text-slate-500">{error ? <span className="text-red-600 dark:text-red-400">{error}</span> : 'Loading…'}</div>
}

function MonthNav({ ym, setYm }: { ym: string; setYm: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={ghost} aria-label="Previous month" onClick={() => setYm(shiftMonth(ym, -1))}>‹</button>
      <div className="min-w-32 text-center font-semibold">{monthLabel(ym)}</div>
      <button type="button" className={ghost} aria-label="Next month" disabled={ym >= thisMonth()} onClick={() => setYm(shiftMonth(ym, 1))}>›</button>
    </div>
  )
}

// ---------------------------------------------------------------- Overview
function Overview({ go }: { go: (t: string) => void }) {
  const { data: o, error } = useData('overview')
  if (!o) return <Loading error={error} />
  const net = o.month_in - o.month_out
  return (
    <div className="flex flex-col gap-4">
      {!o.bank_linked && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          The Capital One account is not connected yet, so spending only shows what you enter by hand or import. Income comes from Givebutter.
        </div>
      )}
      {o.cash_source === 'bank' && Math.abs(o.cash_gap) > 500 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Cash on hand is the bank&apos;s own balance. The books show {usd(o.cash + o.cash_gap)}, {usd(o.cash_gap)} more, because the bank history before August is not imported yet. Import the older bank CSV on the Transactions tab to close the gap.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Cash on hand" value={usd(o.cash)} sub={`Safe to spend ${usd(o.safe_to_spend)} (cash above a ${usd(o.reserve)} reserve)`} />
        <Stat label={`Income, ${monthLabel(o.month, 'short')}`} value={usd(o.month_in)} />
        <Stat label={`Spending, ${monthLabel(o.month, 'short')}`} value={usd(o.month_out)} />
        <Stat label="Net this month" value={usd(net, { sign: true })} tone={net < 0 ? 'bad' : 'good'} />
        <Stat label="Year to date income" value={usd(o.ytd_in)} />
        <Stat label="Year to date spending" value={usd(o.ytd_out)} />
        <Stat label="Runway above reserve" value={o.runway == null ? 'Not shrinking' : `${o.runway} months`} tone={o.runway != null && o.runway < 6 ? 'warn' : undefined} />
        <Stat label="Monthly givers" value={String(o.partners)} sub={`Largest is ${o.largest_share}% of the total`} tone={o.largest_share >= 40 ? 'warn' : undefined} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className={card}>
          <h2 className="font-semibold mb-2">Needs attention</h2>
          <ul className="text-sm flex flex-col gap-2">
            <li className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${o.exceptions ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {o.exceptions ? <>{o.exceptions} bank {o.exceptions === 1 ? 'item needs' : 'items need'} a category. <button type="button" className="underline" onClick={() => go('transactions')}>Sort them</button></> : 'Every bank item is categorized.'}
            </li>
            {(o.recurring_missing ?? []).map((r: Json, i: number) => (
              <li key={i} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />{r.name}: {r.problem}.</li>
            ))}
            <li className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${o.balanced ? 'bg-emerald-500' : 'bg-red-500'}`} />{o.balanced ? 'The books balance.' : 'The books do not balance. Check the journal.'}</li>
            <li className="text-xs text-slate-400">{o.last_sync ? `Last sync ${new Date(o.last_sync.ts).toLocaleString()} (${o.last_sync.ok ? 'ok' : 'had a problem'})` : 'No sync yet.'}</li>
          </ul>
        </div>
        <div className={card}>
          <h2 className="font-semibold mb-2">Where to go next</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghost} onClick={() => go('spending')}>Spending and budget</button>
            <button type="button" className={ghost} onClick={() => go('forecast')}>Forecast</button>
            <button type="button" className={ghost} onClick={() => go('board')}>Board report</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Spending + budget
function Spending() {
  const [ym, setYm] = useState(thisMonth())
  const end = useMemo(() => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` }, [ym])
  const { data: act, error } = useData(`statements/activity?start=${ym}-01&end=${end}`)
  const { data: bud, reload: reloadBud } = useData(`budget/${ym}`)
  const { data: accts } = useData<Json[]>('accounts')
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [wholeYear, setWholeYear] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function saveBudget() {
    if (!code || !amount) return
    setBusy(true); setErr('')
    try {
      const year = ym.slice(0, 4)
      const months = wholeYear ? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`) : [ym]
      await api('budget', 'POST', { code, amount, months })
      setAmount(''); reloadBud()
    } catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(false) }
  }

  if (!act) return <Loading error={error} />
  const exp = [...act.expenses].sort((a: Json, b: Json) => b.cents - a.cents)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3"><MonthNav ym={ym} setYm={setYm} /><span className="text-sm text-slate-500">Income {usd(act.total_revenue)} · Spending {usd(act.total_expenses)} · Net {usd(act.change, { sign: true })}</span></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={card}><h2 className="font-semibold mb-2">Spending by category</h2><Bars rows={exp.map((e: Json) => ({ name: e.name, cents: e.cents }))} total={act.total_expenses} /></div>
        <div className={card}><h2 className="font-semibold mb-2">Income by source</h2><Bars rows={act.revenue.map((e: Json) => ({ name: e.name, cents: e.cents }))} total={act.total_revenue} /></div>
      </div>
      <div className={card}>
        <h2 className="font-semibold mb-2">Budget compared with actual</h2>
        {!bud ? <p className="text-sm text-slate-400">Loading…</p> : bud.rows.length === 0 ? <p className="text-sm text-slate-400">No budget set for {monthLabel(ym)} yet. Add lines below.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400"><th className="font-normal">Line</th><th className="font-normal text-right">Budget</th><th className="font-normal text-right">Actual</th><th className="font-normal text-right">Difference</th></tr></thead>
            <tbody>
              {bud.rows.map((b: Json) => {
                const over = b.type === 'expense' ? b.variance > 0 : b.variance < 0
                return (
                  <tr key={b.code} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1">{b.name}</td><td className="text-right tabular-nums">{usd(b.budget)}</td><td className="text-right tabular-nums">{usd(b.actual)}</td>
                    <td className={`text-right tabular-nums ${over ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{usd(b.variance, { sign: true })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <select value={code} onChange={(e) => setCode(e.target.value)} className={field}>
            <option value="">Add or change a line…</option>
            {(accts ?? []).filter((a) => a.type === 'expense' || a.type === 'revenue').map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monthly amount" inputMode="decimal" className={`${field} w-36`} />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={wholeYear} onChange={(e) => setWholeYear(e.target.checked)} />All of {ym.slice(0, 4)}</label>
          <button type="button" className={btn} disabled={busy || !code || !amount} onClick={saveBudget}>Save</button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Transactions
function Transactions() {
  const { data: ex, reload: reloadEx, error } = useData<Json[]>('transactions?status=exception')
  const { data: recent, reload: reloadRecent } = useData<Json[]>('transactions')
  const { data: accts } = useData<Json[]>('accounts')
  const [pick, setPick] = useState<Record<number, string>>({})
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [manual, setManual] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', code: '', memo: '', paid_from: '1000' })
  const [note, setNote] = useState('')

  const reload = () => { reloadEx(); reloadRecent() }
  async function resolve(t: Json, ignore = false) {
    const code = pick[t.id]
    if (!ignore && !code) return
    setBusy(t.id); setErr('')
    try { await api(`transactions/${t.id}/resolve`, 'POST', { code, remember, ignore }); reload() } catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(null) }
  }
  async function addManual() {
    setErr(''); setNote('')
    try { await api('manual', 'POST', manual); setNote('Entry added.'); setManual({ ...manual, amount: '', memo: '' }); reload() } catch (e) { setErr(String((e as Error).message ?? e)) }
  }
  async function importCsv(f: File | undefined) {
    if (!f) return
    setErr(''); setNote('')
    const fd = new FormData(); fd.append('file', f)
    try { const r = await api('import/csv', 'POST', fd); setNote(`Imported: ${JSON.stringify(r)}`); reload() } catch (e) { setErr(String((e as Error).message ?? e)) }
  }
  const options = (accts ?? []).filter((a) => a.type === 'expense' || a.type === 'revenue')
  if (!ex) return <Loading error={error} />
  return (
    <div className="flex flex-col gap-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className={card}>
        <div className="flex items-center gap-3 mb-2"><h2 className="font-semibold">Needs a category ({ex.length})</h2><label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember this payee</label></div>
        {ex.length === 0 ? <p className="text-sm text-slate-400">Nothing waiting. New bank items that no rule recognizes will show up here.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {ex.map((t) => (
              <li key={t.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 text-slate-500">{t.posted}</span>
                <span className="flex-1 min-w-40">{t.desc_raw}</span>
                <span className={`tabular-nums font-medium ${t.cents < 0 ? '' : 'text-emerald-600 dark:text-emerald-400'}`}>{usd(t.cents)}</span>
                <select value={pick[t.id] ?? ''} onChange={(e) => setPick({ ...pick, [t.id]: e.target.value })} className={field}>
                  <option value="">Category…</option>
                  {options.filter((a) => (t.cents < 0 ? a.type === 'expense' : a.type === 'revenue')).map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
                </select>
                <button type="button" className={btn} disabled={busy === t.id || !pick[t.id]} onClick={() => resolve(t)}>Save</button>
                <button type="button" className={ghost} disabled={busy === t.id} onClick={() => resolve(t, true)}>Ignore</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-2">Add an expense by hand</h2>
        <p className="text-xs text-slate-500 mb-2">For cash or a personal card. Anything paid to or by an insider needs a recorded board approval, so add those in the tailnet app for now.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} className={field} />
          <input value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} placeholder="Amount" inputMode="decimal" className={`${field} w-28`} />
          <select value={manual.code} onChange={(e) => setManual({ ...manual, code: e.target.value })} className={field}><option value="">Category…</option>{options.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select>
          <select value={manual.paid_from} onChange={(e) => setManual({ ...manual, paid_from: e.target.value })} className={field}><option value="1000">Checking</option><option value="2000">Credit card</option></select>
          <input value={manual.memo} onChange={(e) => setManual({ ...manual, memo: e.target.value })} placeholder="What was it?" className={`${field} flex-1 min-w-40`} />
          <button type="button" className={btn} disabled={!manual.amount || !manual.code} onClick={addManual}>Add</button>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm"><label className={`${ghost} cursor-pointer`}>Import a bank CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => importCsv(e.target.files?.[0])} /></label>{note && <span className="text-slate-500">{note}</span>}</div>
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-2">Recent bank activity</h2>
        {!recent ? <p className="text-sm text-slate-400">Loading…</p> : recent.length === 0 ? <p className="text-sm text-slate-400">No bank items yet. They appear once the bank is connected or a CSV is imported.</p> : (
          <table className="w-full text-sm">
            <tbody>
              {recent.slice(0, 60).map((t) => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">{t.posted}</td><td className="pr-2">{t.desc_raw}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{usd(t.cents)}</td><td className="pl-2 text-xs text-slate-400">{t.status}{t.acct_code ? ` · ${t.acct_code}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Forecast
function Forecast() {
  const { data: f, error } = useData('forecast')
  const { data: planned, reload } = useData<Json[]>('planned')
  const [form, setForm] = useState({ date: '', descr: '', amount: '', kind: 'expense' })
  const [err, setErr] = useState('')
  async function add() {
    setErr('')
    try { await api('planned', 'POST', form); setForm({ ...form, descr: '', amount: '' }); reload() } catch (e) { setErr(String((e as Error).message ?? e)) }
  }
  async function del(id: number) { await api(`planned/${id}`, 'DELETE'); reload() }
  if (!f) return <Loading error={error} />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Cash today" value={usd(f.cash)} />
        <Stat label="Expected monthly income" value={usd(f.monthly_income)} sub={`${usd(f.recurring_income)} recurring`} />
        <Stat label="Expected monthly spending" value={usd(f.monthly_expense)} />
        <Stat label="Monthly net" value={usd(f.monthly_net, { sign: true })} tone={f.monthly_net < 0 ? 'bad' : 'good'} />
        <Stat label="Reserve target" value={usd(f.reserve)} sub="months of spending kept back" />
        <Stat label="Safe to spend" value={usd(f.safe_to_spend)} sub="cash above the reserve" />
        <Stat label="Runway above reserve" value={f.runway_months == null ? 'Not shrinking' : `${f.runway_months} months`} tone={f.runway_months != null && f.runway_months < 6 ? 'warn' : undefined} />
        <Stat label="Monthly givers" value={String(f.partners)} sub={`Largest is ${f.largest_partner_share_pct}%`} tone={f.largest_partner_share_pct >= 40 ? 'warn' : undefined} />
      </div>
      <div className={card}>
        <h2 className="font-semibold mb-1">Cash over the next 12 months</h2>
        <p className="text-xs text-slate-500 mb-2">Solid line: expected. Shaded band: from the low case (our largest monthly giver stops) to the high case. Red dashed line: the reserve.</p>
        <ForecastChart points={f.points} reserve={f.reserve} />
        <table className="w-full text-sm mt-3">
          <thead><tr className="text-left text-xs text-slate-400"><th className="font-normal">Month</th><th className="font-normal text-right">Low</th><th className="font-normal text-right">Expected</th><th className="font-normal text-right">High</th></tr></thead>
          <tbody>{f.points.map((p: Json) => (<tr key={p.ym} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{monthLabel(p.ym)}</td><td className="text-right tabular-nums">{usd(p.low)}</td><td className="text-right tabular-nums font-medium">{usd(p.expected)}</td><td className="text-right tabular-nums">{usd(p.high)}</td></tr>))}</tbody>
        </table>
      </div>
      <div className={card}>
        <h2 className="font-semibold mb-1">Planned items</h2>
        <p className="text-xs text-slate-500 mb-2">One-off money you know is coming or going (a printing run, a large gift, a conference). They are added to the forecast on their date.</p>
        {(planned ?? []).length > 0 && (
          <ul className="mb-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {(planned ?? []).map((p) => (
              <li key={p.id} className="py-1.5 flex items-center gap-3"><span className="w-24 text-slate-500">{p.planned_date}</span><span className="flex-1">{p.descr}</span><span className={`tabular-nums ${p.kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{p.kind === 'income' ? '+' : '-'}{usd(Math.abs(p.cents))}</span><button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => del(p.id)}>Remove</button></li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
          <input value={form.descr} onChange={(e) => setForm({ ...form, descr: e.target.value })} placeholder="What is it?" className={`${field} flex-1 min-w-40`} />
          <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" inputMode="decimal" className={`${field} w-28`} />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={field}><option value="expense">Spending</option><option value="income">Income</option></select>
          <button type="button" className={btn} disabled={!form.date || !form.descr || !form.amount} onClick={add}>Add</button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Board
function Board() {
  const { data: preview, error } = useData<BoardData>('board-preview')
  const { data: links, reload } = useData<{ links: Json[] }>('board-link')
  const { data: packets, reload: reloadPackets } = useData<Json[]>('packets')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  async function make() {
    setErr('')
    try {
      const r = await fetch('/api/fmsmoney/board-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'board' }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not make the link')
      setLink(`${window.location.origin}/fmsmoney/board/${d.token}`); setCopied(false); reload()
    } catch (e) { setErr(String((e as Error).message ?? e)) }
  }
  async function revoke() {
    if (!window.confirm('Turn off the board link? Anyone with the old link will see "not active". You can make a new one.')) return
    await fetch('/api/fmsmoney/board-link', { method: 'DELETE' }); setLink(''); reload()
  }
  async function build(ym: string) { setErr(''); try { await api(`packets/${ym}/build`, 'POST', {}); reloadPackets() } catch (e) { setErr(String((e as Error).message ?? e)) } }
  async function approve(ym: string) { setErr(''); try { await api(`packets/${ym}/approve`, 'POST', { note: '' }); reloadPackets() } catch (e) { setErr(String((e as Error).message ?? e)) } }

  const active = (links?.links ?? []).length > 0
  const lastMonth = shiftMonth(thisMonth(), -1)
  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <h2 className="font-semibold mb-1">Board link</h2>
        <p className="text-sm text-slate-500 mb-3">A read-only page for the board. Anyone with the link can read it, so share it only with board members. It shows totals only: no donor names and no account numbers. You can turn it off at any time.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={make}>{active ? 'Make a new link' : 'Make the board link'}</button>
          {active && <button type="button" className={ghost} onClick={revoke}>Turn the link off</button>}
          <span className="text-xs text-slate-400">{active ? 'A link is active.' : 'No link is active.'}</span>
        </div>
        {link && (
          <div className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm break-all">
            <div className="font-medium mb-1">Copy this now. For safety it is shown only once.</div>
            <div className="font-mono text-xs">{link}</div>
            <button type="button" className={`${ghost} mt-2`} onClick={() => { navigator.clipboard?.writeText(link); setCopied(true) }}>{copied ? 'Copied' : 'Copy link'}</button>
            <p className="text-xs text-slate-500 mt-2">Making a new link turns the old one off.</p>
          </div>
        )}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-1">Monthly PDF packets</h2>
        <p className="text-sm text-slate-500 mb-3">A printable packet for each month. Build it, read it, and approve it. Emailing packets to the board comes later; for now nothing is sent from here.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3"><button type="button" className={ghost} onClick={() => build(lastMonth)}>Build {monthLabel(lastMonth)}</button></div>
        {!packets ? null : packets.length === 0 ? <p className="text-sm text-slate-400">No packets yet.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {packets.map((p) => (
              <li key={p.id} className="py-1.5 flex flex-wrap items-center gap-3">
                <span className="w-32 font-medium">{monthLabel(p.ym)}</span><span className="text-slate-500">{p.status}</span><span className="flex-1" />
                <a className="underline" href={`/api/fmsmoney/packets/${p.ym}/html`} target="_blank" rel="noreferrer">Read</a>
                <a className="underline" href={`/api/fmsmoney/packets/${p.ym}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                {p.status === 'draft' && <button type="button" className={ghost} onClick={() => approve(p.ym)}>Approve</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-1 px-1">Preview: what the board sees</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">{preview ? <BoardReport d={preview} /> : <Loading error={error} />}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- shell
const TABS: [string, string][] = [['overview', 'Overview'], ['spending', 'Spending'], ['transactions', 'Transactions'], ['forecast', 'Forecast'], ['board', 'Board']]

export default function FmsMoneyApp({ user, logout }: { user: string; logout: ReactNode }) {
  const [tab, setTab] = useState('overview')
  const go = useCallback((t: string) => { setTab(t); window.location.hash = t }, [])
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (TABS.some(([k]) => k === h)) setTab(h)
  }, [])
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-lg font-bold">FMS Finance</h1><span className="text-xs text-slate-400">Faith Makes Sense</span><span className="flex-1" />
        <span className="text-xs text-slate-400 hidden sm:inline">{user}</span>{logout}
      </header>
      <nav className="flex gap-1 overflow-x-auto mb-4 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => go(k)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-slate-900 dark:border-white' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{label}</button>
        ))}
      </nav>
      {tab === 'overview' && <Overview go={go} />}
      {tab === 'spending' && <Spending />}
      {tab === 'transactions' && <Transactions />}
      {tab === 'forecast' && <Forecast />}
      {tab === 'board' && <Board />}
    </div>
  )
}
