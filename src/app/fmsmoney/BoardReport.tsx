import { monthLabel, pct, usd } from './fmt'

// The board report: totals only (no donor names, no account numbers). Used by the public read-only link and by the
// signed-in preview, so what Bill checks is exactly what the board sees.

type Row = { name: string; cents: number; function?: string | null }
type Budget = { code: string; name: string; type: string; budget: number; actual: number; variance: number }
type Trend = { ym: string; income: number; spending: number }
type Point = { ym: string; expected: number; low: number; high: number }

export type BoardData = {
  name: string; month: string; generated: string
  month_income: number; month_spending: number; month_change: number
  ytd_income: number; ytd_spending: number; ytd_change: number
  income_by_source: Row[]; spending_by_category: Row[]; budget: Budget[]; trend: Trend[]
  functional_ytd: Record<string, number>
  position: { assets: number; liabilities: number; net_assets: number; restricted: number; unrestricted: number }
  forecast: {
    cash: number; monthly_income: number; monthly_expense: number; monthly_net: number; reserve: number; safe_to_spend: number
    runway_months: number | null; partners: number; largest_partner_share_pct: number; points: Point[]
  }
  books_balanced: boolean; reconciled?: boolean; bank_feed: boolean; last_sync: string | null
}

const card = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 print:break-inside-avoid'

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={card}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${tone === 'bad' ? 'text-red-600 dark:text-red-400' : tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export function TrendChart({ trend }: { trend: Trend[] }) {
  const max = Math.max(1, ...trend.flatMap((t) => [t.income, t.spending]))
  const w = 600, h = 160, pad = 24, bw = (w - pad * 2) / trend.length
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label="Income and spending, last 12 months">
      {trend.map((t, i) => {
        const x = pad + i * bw
        const hi = (t.income / max) * h, hs = (t.spending / max) * h
        return (
          <g key={t.ym}>
            <rect x={x + 2} y={h - hi} width={bw / 2 - 3} height={hi} rx={2} className="fill-emerald-500" />
            <rect x={x + bw / 2} y={h - hs} width={bw / 2 - 3} height={hs} rx={2} className="fill-amber-500" />
            <text x={x + bw / 2} y={h + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">{monthLabel(t.ym, 'short').slice(0, 3)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function ForecastChart({ points, reserve }: { points: Point[]; reserve: number }) {
  if (!points.length) return null
  const all = points.flatMap((p) => [p.expected, p.low, p.high, reserve])
  const min = Math.min(0, ...all), max = Math.max(1, ...all)
  const w = 600, h = 170, pad = 10
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1)
  const y = (v: number) => h - ((v - min) / (max - min)) * h
  const path = (k: 'expected' | 'low' | 'high') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[k])}`).join(' ')
  const band = `${points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.high)}`).join(' ')} ${[...points].reverse().map((p, i) => `L${x(points.length - 1 - i)},${y(p.low)}`).join(' ')} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label="Cash forecast with low and high range">
      <path d={band} className="fill-sky-500/15" />
      <line x1={pad} x2={w - pad} y1={y(reserve)} y2={y(reserve)} className="stroke-red-400" strokeDasharray="4 4" />
      <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} className="stroke-slate-300 dark:stroke-slate-700" />
      <path d={path('low')} className="stroke-sky-400 fill-none" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path('high')} className="stroke-sky-400 fill-none" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path('expected')} className="stroke-sky-600 fill-none" strokeWidth={2.5} />
      {points.map((p, i) => (i % 2 === 0 ? <text key={p.ym} x={x(i)} y={h + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">{monthLabel(p.ym, 'short').slice(0, 3)}</text> : null))}
    </svg>
  )
}

export function Bars({ rows, total }: { rows: Row[]; total: number }) {
  if (!rows.length) return <p className="text-sm text-slate-400">Nothing recorded for this month.</p>
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex justify-between gap-3"><span>{r.name}</span><span className="tabular-nums">{usd(r.cents)} <span className="text-slate-400">{pct(r.cents, total)}</span></span></div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1"><div className="h-1.5 rounded-full bg-slate-600 dark:bg-slate-300" style={{ width: `${total > 0 ? Math.max(2, (r.cents / total) * 100) : 0}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function BoardReport({ d }: { d: BoardData }) {
  const f = d.forecast
  const fnTotal = Object.values(d.functional_ytd).reduce((a, b) => a + b, 0)
  const month = monthLabel(d.month)
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">{d.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">Board financial report for {month}</p>
        <p className="text-xs text-slate-400">Prepared {new Date(d.generated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}{d.last_sync ? `. Books last updated ${new Date(d.last_sync).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` : '.'}</p>
      </header>

      {d.reconciled === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          The books are still being reconciled to the bank, so spending and net assets are not final. Cash on hand is the bank&apos;s own balance.
        </div>
      )}

      {!d.bank_feed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          The bank account is not connected to the books yet, so spending shown here is only what has been entered by hand. Income comes from Givebutter.
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={`Income, ${monthLabel(d.month, 'short')}`} value={usd(d.month_income)} />
        <Stat label={`Spending, ${monthLabel(d.month, 'short')}`} value={usd(d.month_spending)} />
        <Stat label="Net for the month" value={usd(d.month_change, { sign: true })} tone={d.month_change < 0 ? 'bad' : 'good'} />
        <Stat label="Cash on hand" value={usd(f.cash)} sub={d.reconciled === false ? 'Bank balance' : `Net assets ${usd(d.position.net_assets)}`} />
        <Stat label="Year to date income" value={usd(d.ytd_income)} />
        <Stat label="Year to date spending" value={usd(d.ytd_spending)} />
        <Stat label="Year to date net" value={usd(d.ytd_change, { sign: true })} tone={d.ytd_change < 0 ? 'bad' : 'good'} />
        <Stat label="Reserve target" value={usd(f.reserve)} sub={`Safe to spend ${usd(f.safe_to_spend)}`} />
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-1">Last 12 months</h2>
        <div className="flex gap-4 text-xs text-slate-500 mb-1"><span><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500 mr-1" />Income</span><span><span className="inline-block h-2 w-2 rounded-sm bg-amber-500 mr-1" />Spending</span></div>
        <TrendChart trend={d.trend} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className={card}><h2 className="font-semibold mb-2">Where income came from</h2><Bars rows={d.income_by_source} total={d.month_income} /></div>
        <div className={card}><h2 className="font-semibold mb-2">Where spending went</h2><Bars rows={d.spending_by_category} total={d.month_spending} /></div>
      </section>

      {d.budget.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold mb-2">Budget compared with actual, {month}</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400"><th className="font-normal">Line</th><th className="font-normal text-right">Budget</th><th className="font-normal text-right">Actual</th><th className="font-normal text-right">Difference</th></tr></thead>
            <tbody>
              {d.budget.map((b) => {
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
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold mb-2">How the money is used, year to date</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {Object.entries(d.functional_ytd).map(([k, v]) => (
            <div key={k}><div className="text-xs text-slate-500">{k}</div><div className="font-semibold tabular-nums">{usd(v)}</div><div className="text-xs text-slate-400">{pct(v, fnTotal)}</div></div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-1">Looking ahead: cash over the next 12 months</h2>
        <p className="text-xs text-slate-500 mb-2">The line is the expected path. The shaded band runs from the low case (our largest monthly giver stops) to the high case. The red dashed line is the reserve.</p>
        <ForecastChart points={f.points} reserve={f.reserve} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
          <div><div className="text-xs text-slate-500">Expected monthly income</div><div className="font-semibold">{usd(f.monthly_income)}</div></div>
          <div><div className="text-xs text-slate-500">Expected monthly spending</div><div className="font-semibold">{usd(f.monthly_expense)}</div></div>
          <div><div className="text-xs text-slate-500">Runway above the reserve</div><div className="font-semibold">{f.runway_months == null ? 'Not shrinking' : `${f.runway_months} months`}</div></div>
          <div><div className="text-xs text-slate-500">Monthly givers</div><div className="font-semibold">{f.partners} <span className="text-xs font-normal text-slate-400">largest is {f.largest_partner_share_pct}% of that</span></div></div>
        </div>
      </section>

      <footer className="text-xs text-slate-400 pb-6">
        Totals only. This page shows no donor names or account numbers.{d.books_balanced ? ' The books balance.' : ' Note: the books do not balance right now; treasurer is reviewing.'}
      </footer>
    </div>
  )
}
