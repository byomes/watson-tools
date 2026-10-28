'use client'

import { notifyDssChanged, useDssSync } from '@/lib/dssSync'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

// Shared plumbing for the Catalyst dashboard: API helper, hash router, the people list
// every screen can search, and the small UI pieces (cards, badges, tabs) that keep all
// the screens looking like one app.

// Rows come straight from the Watson API; screens read only the fields they show.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export async function chm<T = Row>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/cat/chm/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  if (method !== 'GET') notifyDssChanged()
  return data as T
}

// Every dashboard screen re-reads its data when something is written anywhere in the DSS, when you come back to the tab, and
// once a minute (see lib/dssSync.ts), so a change made on one screen shows on all of them without a manual reload.
export function useLiveTick(): number {
  const [tick, setTick] = useState(0)
  useDssSync(() => setTick((t) => t + 1))
  return tick
}

export function useChm<T = Row>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const live = useLiveTick()
  useEffect(() => {
    if (!path) return
    let alive = true
    chm<T>(path)
      .then((d) => {
        if (alive) {
          setData(d)
          setError('')
        }
      })
      .catch((e) => { if (alive && live === 0) setError(String(e.message ?? e)) })
    return () => {
      alive = false
    }
  }, [path, tick, live])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, reload, setData }
}

// ---------------------------------------------------------------- routing

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const readHash = () => window.location.hash.replace(/^#\/?/, '') || 'home'

export function useHashRoute(): [string, (r: string) => void] {
  const route = useSyncExternalStore(subscribeHash, readHash, () => 'home')
  const go = useCallback((r: string) => {
    window.location.hash = '/' + r
  }, [])
  return [route, go]
}

export const NavContext = createContext<{ go: (r: string) => void }>({ go: () => {} })
export const useNav = () => useContext(NavContext)

// ------------------------------------------------------------ people list

export interface Person {
  id: number
  name: string
  active: string | null
  household_id: string | null
  household_role: string | null
  deacon: string | null
  connected: string
}

export const PeopleContext = createContext<{ people: Person[]; refresh: () => void }>({ people: [], refresh: () => {} })
export const usePeople = () => useContext(PeopleContext)

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([])
  const load = useCallback(() => {
    fetch('/api/cat/catalystdb/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPeople(d.members ?? []))
      .catch(() => {})
  }, [])
  const live = useLiveTick()
  useEffect(load, [load, live])
  const value = useMemo(() => ({ people, refresh: load }), [people, load])
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>
}

// -------------------------------------------------------------- UI pieces

export function fmtDate(d?: string | null): string {
  if (!d) return ''
  const day = d.slice(0, 10)
  const dt = new Date(day + 'T12:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ago(d?: string | null): string {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d.slice(0, 10) + 'T12:00:00').getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 90) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

const CONNECTED_STYLE: Record<string, string> = {
  regular: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'at risk': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  disconnected: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  '1st time': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  '2nd time': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  guest: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  neighbor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

export function ConnBadge({ value }: { value?: string | null }) {
  if (!value) return null
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONNECTED_STYLE[value] ?? CONNECTED_STYLE.neighbor}`}>
      {value}
    </span>
  )
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'amber' | 'red' | 'green' }) {
  const t = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  }[tone]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {action}
        </header>
      )}
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400 dark:text-slate-500 py-2">{children}</p>
}

export function Loading({ error }: { error?: string }) {
  return (
    <div className="p-8 text-sm text-slate-500 dark:text-slate-400">
      {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : 'Loading…'}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-2 sm:px-4 bg-white dark:bg-slate-900">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            active === t.key
              ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 text-xs text-slate-400">{t.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export const inputCls =
  'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400'
export const btnCls =
  'rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40'
export const btnGhost =
  'rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'

/** A person's name that jumps to their profile. */
export function PersonLink({ id, name, className = '' }: { id: number; name: string; className?: string }) {
  const { go } = useNav()
  return (
    <button type="button" onClick={() => go(`person/${id}`)} className={`text-left font-medium text-slate-900 dark:text-white hover:underline ${className}`}>
      {name}
    </button>
  )
}

/** Type-to-find person chooser used wherever someone has to be added to something. */
export function PersonPicker({ onPick, placeholder = 'Add a person…', exclude = [] }: { onPick: (p: Person) => void; placeholder?: string; exclude?: number[] }) {
  const { people } = usePeople()
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    return people.filter((p) => p.name.toLowerCase().includes(needle) && !exclude.includes(p.id)).slice(0, 8)
  }, [q, people, exclude])
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={`${inputCls} w-full`} />
      {matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-64 overflow-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p)
                  setQ('')
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
              >
                {p.name} <span className="text-xs text-slate-400">{p.household_role ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Click-outside / Escape close for popovers. */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  return ref
}
