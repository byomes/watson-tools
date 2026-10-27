// Money in the FMS books is whole cents. These keep every screen formatting it the same way.

export function usd(cents: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (cents == null || Number.isNaN(cents)) return '–'
  const abs = Math.abs(cents) / 100
  const s = abs.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: abs % 1 === 0 ? 0 : 2 })
  if (cents < 0) return `-${s}`
  return opts.sign && cents > 0 ? `+${s}` : s
}

export function monthLabel(ym: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: style, year: style === 'long' ? 'numeric' : '2-digit' })
}

export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–'
}
