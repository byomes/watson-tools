'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Group = 'leaders' | 'deacons' | 'elders'
const GROUPS: { key: Group; label: string }[] = [
  { key: 'leaders', label: 'Leaders' },
  { key: 'deacons', label: 'Deacons' },
  { key: 'elders', label: 'Elders' },
]

type TableRow = {
  db: string
  name: string
  rows: number | null
  cols: string[]
  sensitive: string[]
  open_now: boolean
  locked: boolean
  suggest: 'open now' | 'suggest open' | 'suggest closed' | 'your call'
  grants: Record<Group, boolean>
}

type Change = { db: string; table: string; group: Group; allowed: boolean }

type Filter = 'all' | 'open now' | 'suggest open' | 'your call' | 'suggest closed' | 'sensitive' | 'granted' | 'none'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open now', label: 'Open now' },
  { key: 'suggest open', label: 'Suggest open' },
  { key: 'your call', label: 'Your call' },
  { key: 'suggest closed', label: 'Suggest closed' },
  { key: 'sensitive', label: 'Has personal columns' },
  { key: 'granted', label: 'Granted to someone' },
  { key: 'none', label: 'Granted to no one' },
]

const BADGE: Record<TableRow['suggest'], string> = {
  'open now': 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  'suggest open': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'your call': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'suggest closed': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

const anyGrant = (t: TableRow) => GROUPS.some((g) => t.grants[g.key])

export default function TableAccessBoard() {
  const [tables, setTables] = useState<TableRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(0)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [db, setDb] = useState<'all' | 'congregation' | 'watson'>('all')
  const [query, setQuery] = useState('')
  const [hideLocked, setHideLocked] = useState(true)
  // Rows a grant-based filter matched at the moment it was chosen. Without this, ticking a box on a row under "Granted to no one"
  // made it stop matching and vanish mid-click, which read as the check mark disappearing.
  const [snapshot, setSnapshot] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/sms/table-access', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/sms/login'
        return
      }
      if (!res.ok) throw new Error('Could not load tables')
      const data = await res.json()
      setTables(data.tables)
      setSavedAt(data.updated_at ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tables')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (!tables) return []
    const q = query.trim().toLowerCase()
    return tables.filter((t) => {
      if (hideLocked && t.locked) return false
      if (db !== 'all' && t.db !== db) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.cols.some((c) => c.toLowerCase().includes(q))) return false
      switch (filter) {
        case 'all': return true
        case 'sensitive': return t.sensitive.length > 0
        case 'granted': return snapshot[`${t.db}.${t.name}`] ?? anyGrant(t)
        case 'none': return !(snapshot[`${t.db}.${t.name}`] ?? anyGrant(t))
        default: return t.suggest === filter
      }
    })
  }, [tables, query, db, filter, hideLocked, snapshot])

  const totals = useMemo(() => {
    const out: Record<Group, number> = { leaders: 0, deacons: 0, elders: 0 }
    for (const t of tables ?? []) for (const g of GROUPS) if (t.grants[g.key]) out[g.key] += 1
    return out
  }, [tables])

  async function save(changes: Change[]): Promise<boolean> {
    setSaving((n) => n + 1)
    try {
      const res = await fetch('/api/sms/table-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedAt(data.updated_at ?? null)
      setError(null)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving((n) => n - 1)
    }
  }

  function apply(changes: Change[]) {
    setTables((prev) =>
      prev
        ? prev.map((t) => {
            const mine = changes.filter((c) => c.db === t.db && c.table === t.name)
            if (!mine.length) return t
            const grants = { ...t.grants }
            for (const c of mine) grants[c.group] = c.allowed
            return { ...t, grants }
          })
        : prev,
    )
  }

  async function toggle(t: TableRow, group: Group) {
    const allowed = !t.grants[group]
    const change: Change = { db: t.db, table: t.name, group, allowed }
    apply([change])
    if (!(await save([change]))) apply([{ ...change, allowed: !allowed }])
  }

  async function bulk(group: Group, allowed: boolean) {
    const rows = visible.filter((t) => !t.locked && t.grants[group] !== allowed)
    if (!rows.length) return
    const label = GROUPS.find((g) => g.key === group)?.label
    if (!window.confirm(`${allowed ? 'Grant' : 'Remove'} ${label} access ${allowed ? 'to' : 'from'} ${rows.length} shown table${rows.length === 1 ? '' : 's'}?`)) return
    const changes: Change[] = rows.map((t) => ({ db: t.db, table: t.name, group, allowed }))
    apply(changes)
    if (!(await save(changes))) apply(changes.map((c) => ({ ...c, allowed: !allowed })))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Table Access</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        Which Watson tables team-chat questions may read, set separately for leaders, deacons and elders. Each tick saves instantly.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        These choices are recorded now. Team chat starts following them once enforcement is switched on. The SMS message log and anything holding PINs, sessions or tokens is locked and can never be granted.
      </p>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 mb-3">
          {error}{' '}
          <button type="button" onClick={load} className="underline">Reload</button>
        </p>
      )}

      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables or columns"
            className="flex-1 min-w-[10rem] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
          <select
            value={db}
            onChange={(e) => setDb(e.target.value as typeof db)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm"
            aria-label="Database"
          >
            <option value="all">Both databases</option>
            <option value="congregation">congregation</option>
            <option value="watson">watson</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={hideLocked} onChange={(e) => setHideLocked(e.target.checked)} />
            Hide locked
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto" aria-live="polite">
            {saving > 0 ? 'Saving…' : savedAt ? 'All changes saved' : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setSnapshot(Object.fromEntries((tables ?? []).map((t) => [`${t.db}.${t.name}`, anyGrant(t)])))
                setFilter(f.key)
              }}
              className={`rounded-full px-3 py-1 text-xs border ${
                filter === f.key
                  ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!tables && !error && <p className="text-sm text-gray-500 py-6">Loading tables…</p>}

      {tables && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left align-bottom">
                <th className="py-2 pr-2 font-semibold">
                  {visible.length} of {tables.length} tables
                </th>
                {GROUPS.map((g) => (
                  <th key={g.key} className="py-2 px-1 text-center w-24 font-semibold">
                    <div>{g.label}</div>
                    <div className="text-[11px] font-normal text-gray-500 dark:text-gray-400">{totals[g.key]} granted</div>
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => bulk(g.key, true)} className="text-[11px] underline text-green-700 dark:text-green-400" title={`Grant ${g.label} access to every shown table`}>all</button>
                      <span className="text-gray-400">/</span>
                      <button type="button" onClick={() => bulk(g.key, false)} className="text-[11px] underline text-red-700 dark:text-red-400" title={`Remove ${g.label} access from every shown table`}>none</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={`${t.db}.${t.name}`} className="border-t border-gray-100 dark:border-gray-900 align-top">
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium break-all">{t.name}</span>
                      <span className={`text-[10px] rounded px-1.5 py-0.5 ${BADGE[t.suggest]}`}>{t.suggest}</span>
                      {t.locked && <span className="text-[10px] rounded px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800">🔒 locked</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t.db} · {t.rows === null ? '?' : t.rows.toLocaleString()} rows · {t.cols.slice(0, 5).join(', ')}
                    </div>
                    {t.sensitive.length > 0 && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">personal columns: {t.sensitive.join(', ')}</div>
                    )}
                  </td>
                  {GROUPS.map((g) => (
                    <td key={g.key} className="py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        className="h-6 w-6 accent-green-600 disabled:opacity-30"
                        checked={t.grants[g.key]}
                        disabled={t.locked}
                        onChange={() => toggle(t, g.key)}
                        aria-label={`${g.label} may query ${t.name}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="text-sm text-gray-500 py-6">No tables match.</p>}
        </div>
      )}
    </div>
  )
}
