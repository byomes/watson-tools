'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COLUMNS, FILTERABLE, type Col } from './columns'
import MemberDetail from './MemberDetail'
import HouseholdsView from './HouseholdsView'
import MergeConfirm from './MergeConfirm'

type Member = Record<string, string | number | null>

async function api(path: string, body?: unknown) {
  const res = await fetch(`/api/cat/catalystdb/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`)
  return res.json()
}

const DEFAULT_VISIBLE = new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))

// "name" is stored "First Last" -- sorting the raw string would alphabetize
// by first name. Bill's ask: the standard view sorts by last name instead.
function lastNameKey(name: string): string {
  const parts = (name || '').trim().split(/\s+/)
  return (parts.length > 1 ? parts[parts.length - 1] : name || '').toLowerCase()
}

// "Deactivated" here means the Deactivate action was used -- active is
// 'disconnected' or 'deceased'. 'non-active' is a separate, manually-set
// status and stays visible in the default view.
function isDeactivated(m: Member): boolean {
  const v = String(m.active ?? '')
  return v === 'disconnected' || v === 'deceased'
}

function CellValue({ col, value }: { col: Col; value: string | number | null }) {
  if (col.type === 'bool') {
    return (
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
            value ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    )
  }
  if (!value) return <span className="text-slate-400 dark:text-slate-500">—</span>
  if (col.type === 'select') {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
        {value}
      </span>
    )
  }
  return <span>{value}</span>
}

export default function CatalystDBBoard() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [firstVisitRange, setFirstVisitRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [view, setView] = useState<'members' | 'households'>('members')
  const [collapsedHouseholds, setCollapsedHouseholds] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(DEFAULT_VISIBLE)
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<{ id: number; key: string } | null>(null)
  const [bulkField, setBulkField] = useState(COLUMNS[0].key)
  const [bulkValue, setBulkValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileSelecting, setMobileSelecting] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  useEffect(() => {
    api('state')
      .then((d) => setMembers(d.members))
      .catch((e) => setError(String(e.message ?? e)))
  }, [])

  useEffect(() => {
    if (!showColPicker) return
    function onPointerDown(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [showColPicker])

  const filtered = useMemo(() => {
    if (!members) return []
    const q = search.trim().toLowerCase()
    let rows = members.filter((m) => {
      // Deactivated members are hidden from the default view -- pick a
      // specific value in the Active filter (e.g. "disconnected") to see
      // them; that filter already exact-matches below, so this default
      // hide only applies while Active is left on "All".
      if (!filters.active && isDeactivated(m)) return false
      if (q) {
        const hay = `${m.name ?? ''} ${m.email ?? ''} ${m.phone ?? ''} ${m.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      for (const [key, val] of Object.entries(filters)) {
        if (!val) continue
        const cur = String(m[key] ?? '')
        if (val === '__active__' && cur !== '1') return false
        if (val === '__inactive__' && cur === '1') return false
        if (key === 'active' && val === '__deactivated__' && !isDeactivated(m)) return false
        if (val !== '__active__' && val !== '__inactive__' && val !== '__deactivated__' && cur !== val) return false
      }
      if (firstVisitRange.from || firstVisitRange.to) {
        const fv = String(m.first_visit_date ?? '')
        if (!fv) return false
        if (firstVisitRange.from && fv < firstVisitRange.from) return false
        if (firstVisitRange.to && fv > firstVisitRange.to) return false
      }
      return true
    })
    rows = rows.slice().sort((a, b) => {
      const av = sort.key === 'name' ? lastNameKey(String(a.name ?? '')) : a[sort.key] ?? ''
      const bv = sort.key === 'name' ? lastNameKey(String(b.name ?? '')) : b[sort.key] ?? ''
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
    return rows
  }, [members, search, filters, firstVisitRange, sort])

  const householdIds = useMemo(
    () => Array.from(new Set((members ?? []).map((m) => String(m.household_id ?? '').trim()).filter(Boolean))),
    [members]
  )

  function toggleSort(key: string) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  }

  function toggleCol(key: string) {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((m) => m.id as number))))
  }

  function toggleSelectRow(id: number) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveCell(id: number, col: Col, value: string | number) {
    setMembers((m) => m && m.map((row) => (row.id === id ? { ...row, [col.key]: value } : row)))
    setEditing(null)
    try {
      await api('update', { ids: [id], field: col.key, value })
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function toggleBool(id: number, col: Col, current: string | number | null) {
    await saveCell(id, col, current ? 0 : 1)
  }

  async function applyBulk() {
    if (selected.size === 0) return
    const col = COLUMNS.find((c) => c.key === bulkField)!
    const value = col.type === 'bool' ? (bulkValue === 'true' ? 1 : 0) : bulkValue
    const ids = Array.from(selected)
    setMembers((m) => m && m.map((row) => (ids.includes(row.id as number) ? { ...row, [bulkField]: value } : row)))
    try {
      await api('update', { ids, field: bulkField, value })
      setSelected(new Set())
      setBulkValue('')
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function deactivateSelected() {
    if (selected.size === 0) return
    if (!confirm(`Deactivate ${selected.size} member(s)? This can be undone by re-activating.`)) return
    const ids = Array.from(selected)
    setMembers((m) => m && m.map((row) => (ids.includes(row.id as number) ? { ...row, active: 'disconnected' } : row)))
    try {
      await api('deactivate', { ids })
      setSelected(new Set())
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const names = (members ?? [])
      .filter((m) => ids.includes(m.id as number))
      .map((m) => String(m.name ?? `#${m.id}`))
      .join(', ')
    if (!confirm(`Permanently delete ${selected.size} member(s)? This cannot be undone.\n\n${names}`)) return
    try {
      await api('delete', { ids })
      setMembers((m) => m && m.filter((row) => !ids.includes(row.id as number)))
      setSelected(new Set())
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  // The single-field /update endpoint already handles one row + one field;
  // a multi-field save from the detail card just fires one call per
  // changed field (there are only ever a handful at once) rather than
  // needing a new batch-fields backend route.
  async function saveDetail(id: number, changes: Record<string, string | number>) {
    setMembers((m) => m && m.map((row) => (row.id === id ? { ...row, ...changes } : row)))
    try {
      await Promise.all(Object.entries(changes).map(([field, value]) => api('update', { ids: [id], field, value })))
      setOpenId(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function deactivateOne(id: number) {
    if (!confirm('Deactivate this member? This can be undone by re-activating.')) return
    setMembers((m) => m && m.map((row) => (row.id === id ? { ...row, active: 'disconnected' } : row)))
    try {
      await api('deactivate', { ids: [id] })
      setOpenId(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function deleteOne(id: number) {
    const name = members?.find((m) => m.id === id)?.name ?? `#${id}`
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    try {
      await api('delete', { ids: [id] })
      setMembers((m) => m && m.filter((row) => row.id !== id))
      setOpenId(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function mergeSelected(keepId: number, mergeId: number, finalName: string, addAlias: boolean) {
    setMergeBusy(true)
    setMergeError(null)
    try {
      const { member } = await api('merge', { keep_id: keepId, merge_id: mergeId, name: finalName, add_alias: addAlias })
      setMembers((m) => m && m.filter((row) => row.id !== mergeId).map((row) => (row.id === keepId ? member : row)))
      setSelected(new Set())
      setMerging(false)
    } catch (e) {
      setMergeError(String((e as Error).message ?? e))
    } finally {
      setMergeBusy(false)
    }
  }

  async function addMember() {
    if (!newName.trim()) return
    try {
      const { member } = await api('create', { name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() })
      setMembers((m) => (m ? [...m, member] : [member]))
      setAdding(false)
      setNewName('')
      setNewEmail('')
      setNewPhone('')
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  const visibleCols = COLUMNS.filter((c) => visible.has(c.key))
  const bulkCol = COLUMNS.find((c) => c.key === bulkField)!
  const deactivatedCount = members ? members.filter(isDeactivated).length : 0
  const viewingDeactivated = filters.active === '__deactivated__'
  const allSelectedDeactivated =
    selected.size > 0 && members != null && Array.from(selected).every((id) => isDeactivated(members.find((m) => m.id === id) ?? {}))

  function viewDeactivated() {
    setFilters((f) => ({ ...f, active: '__deactivated__' }))
  }

  if (!members)
    return (
      <div className="p-8 text-sm text-slate-500 dark:text-slate-400">
        {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : 'Loading…'}
      </div>
    )

  const openMember = openId != null ? members.find((m) => m.id === openId) : null
  if (openMember) {
    return (
      <MemberDetail
        member={openMember}
        onClose={() => setOpenId(null)}
        onSave={(changes) => saveDetail(openId as number, changes)}
        onDeactivate={() => deactivateOne(openId as number)}
        onDelete={() => deleteOne(openId as number)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Desktop header — full filter row + column picker. Hidden below md;
          see the mobile header block right after this for the small-screen
          equivalent (search + a collapsible filter sheet instead). */}
      <div className="hidden md:flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 shrink-0">
          {(['members', 'households'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                view === v
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, notes…"
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {view === 'households' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setCollapsedHouseholds(new Set())}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Expand all
            </button>
            <button
              onClick={() => setCollapsedHouseholds(new Set(householdIds))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Collapse all
            </button>
          </div>
        )}
        {view === 'members' && (
          <>
            <div className="relative" ref={colPickerRef}>
              <button
                onClick={() => setShowColPicker((s) => !s)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Columns
              </button>
              {showColPicker && (
                <div className="absolute left-0 mt-1 w-56 max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20 p-2">
                  {COLUMNS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggleCol(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setFilters({})
                setFirstVisitRange({ from: '', to: '' })
              }}
              disabled={!Object.values(filters).some((v) => v) && !firstVisitRange.from && !firstVisitRange.to}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Filters
            </button>
            {FILTERABLE.map((c) => (
              <select
                key={c.key}
                value={filters[c.key] ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="">{c.label}: All</option>
                {c.key === 'active' && <option value="__deactivated__">Deactivated</option>}
                {c.type === 'bool'
                  ? [
                      <option key="a" value="__active__">Yes</option>,
                      <option key="i" value="__inactive__">No</option>,
                    ]
                  : c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
              </select>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">First visit</span>
              <input
                type="date"
                value={firstVisitRange.from}
                onChange={(e) => setFirstVisitRange((r) => ({ ...r, from: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
              <input
                type="date"
                value={firstVisitRange.to}
                onChange={(e) => setFirstVisitRange((r) => ({ ...r, to: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              />
            </div>
          </>
        )}
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-semibold hover:opacity-90 shrink-0"
        >
          + Add Member
        </button>
        {view === 'members' && (
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
            {filtered.length} of {members.length}
            {deactivatedCount > 0 && !viewingDeactivated && (
              <>
                {' · '}
                <button onClick={viewDeactivated} className="underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:opacity-80">
                  {deactivatedCount} deactivated
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {/* Mobile header — card-list conventions from Airtable/Notion/Coda's
          mobile apps: a persistent search bar, filters tucked into a
          collapsible sheet (not a cramped row of selects), a "Select" mode
          toggle instead of always-visible checkboxes, and a floating "+"
          button below rather than an inline one competing for header space. */}
      <div className="flex md:hidden flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-end gap-2 px-4 py-3 empty:hidden">
          {view === 'members' && (
            <button
              onClick={() => setMobileSelecting((s) => !s)}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 py-1"
            >
              {mobileSelecting ? 'Cancel' : 'Select'}
            </button>
          )}
          {view === 'members' && (
            <button
              onClick={() => setMobileFiltersOpen((s) => !s)}
              className="relative rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Filters
              {(Object.values(filters).some(Boolean) || firstVisitRange.from || firstVisitRange.to) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 px-4 pb-3">
          {(['members', 'households'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize border ${
                view === v
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                  : 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="px-4 pb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
        {view === 'households' && (
          <div className="flex gap-2 px-4 pb-3">
            <button
              onClick={() => setCollapsedHouseholds(new Set())}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Expand all
            </button>
            <button
              onClick={() => setCollapsedHouseholds(new Set(householdIds))}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Collapse all
            </button>
          </div>
        )}
        {view === 'members' && mobileFiltersOpen && (
          <div className="px-4 pb-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={() => {
                setFilters({})
                setFirstVisitRange({ from: '', to: '' })
              }}
              disabled={!Object.values(filters).some((v) => v) && !firstVisitRange.from && !firstVisitRange.to}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Filters
            </button>
            <div className="flex items-center gap-2">
              <select
                value={sort.key}
                onChange={(e) => setSort((s) => ({ ...s, key: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                {['name', 'partner', 'connected', 'active', 'campus_preference', 'deacon'].map((k) => (
                  <option key={k} value={k}>
                    Sort: {COLUMNS.find((c) => c.key === k)?.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSort((s) => ({ ...s, dir: s.dir === 1 ? -1 : 1 }))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                {sort.dir === 1 ? '↑' : '↓'}
              </button>
            </div>
            {FILTERABLE.map((c) => (
              <select
                key={c.key}
                value={filters[c.key] ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <option value="">{c.label}: All</option>
                {c.type === 'bool'
                  ? [
                      <option key="a" value="__active__">Yes</option>,
                      <option key="i" value="__inactive__">No</option>,
                    ]
                  : c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
              </select>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">First visit</span>
              <input
                type="date"
                value={firstVisitRange.from}
                onChange={(e) => setFirstVisitRange((r) => ({ ...r, from: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-300"
              />
              <span className="text-sm text-slate-400 dark:text-slate-500 shrink-0">to</span>
              <input
                type="date"
                value={firstVisitRange.to}
                onChange={(e) => setFirstVisitRange((r) => ({ ...r, to: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-300"
              />
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} of {members.length}
              {deactivatedCount > 0 && !viewingDeactivated && (
                <>
                  {' · '}
                  <button onClick={viewDeactivated} className="underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:opacity-80">
                    {deactivatedCount} deactivated
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-5 py-2 border-b border-red-200 dark:border-red-900">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">
            dismiss
          </button>
        </div>
      )}

      {adding && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-wrap items-center gap-2">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (required)" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white" />
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white" />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white" />
          <button onClick={addMember} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Save</button>
          <button onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500">Cancel</button>
        </div>
      )}

      {view === 'households' && (
        <HouseholdsView
          members={members}
          search={search}
          setMembers={setMembers}
          setError={setError}
          onOpenMember={setOpenId}
          collapsed={collapsedHouseholds}
          setCollapsed={setCollapsedHouseholds}
        />
      )}

      {/* Desktop grid */}
      {view === 'members' && (
      <div className="hidden md:block flex-1 overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 px-3 py-2 w-14">
                <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
              </th>
              {visibleCols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap cursor-pointer select-none hover:text-slate-900 dark:hover:text-white"
                >
                  {c.label}
                  {sort.key === c.key && <span className="ml-1 text-slate-400">{sort.dir === 1 ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const id = m.id as number
              const isSelected = selected.has(id)
              return (
                <tr key={id} className={`border-b border-slate-100 dark:border-slate-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-950'}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(id)} />
                      <button
                        onClick={() => setOpenId(id)}
                        title="Open full record"
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        ⤢
                      </button>
                    </div>
                  </td>
                  {visibleCols.map((c) => {
                    const value = m[c.key]
                    const isEditing = editing?.id === id && editing.key === c.key
                    if (c.readOnly) {
                      return (
                        <td key={c.key} className="px-3 py-1.5 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {value ?? '—'}
                        </td>
                      )
                    }
                    if (c.type === 'bool') {
                      return (
                        <td key={c.key} className="px-3 py-1.5 cursor-pointer" onClick={() => toggleBool(id, c, value)}>
                          <CellValue col={c} value={value} />
                        </td>
                      )
                    }
                    if (isEditing) {
                      if (c.type === 'select') {
                        return (
                          <td key={c.key} className="px-1 py-1">
                            <select
                              autoFocus
                              defaultValue={String(value ?? '')}
                              onBlur={(e) => saveCell(id, c, e.target.value)}
                              onChange={(e) => saveCell(id, c, e.target.value)}
                              className="w-full rounded border border-blue-400 px-1.5 py-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              <option value="">—</option>
                              {c.options?.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                        )
                      }
                      return (
                        <td key={c.key} className="px-1 py-1">
                          <input
                            autoFocus
                            type={c.type === 'date' ? 'date' : 'text'}
                            defaultValue={String(value ?? '')}
                            onBlur={(e) => saveCell(id, c, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            className="w-full rounded border border-blue-400 px-1.5 py-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </td>
                      )
                    }
                    return (
                      <td
                        key={c.key}
                        onClick={() => setEditing({ id, key: c.key })}
                        className="px-3 py-1.5 whitespace-nowrap cursor-text text-slate-800 dark:text-slate-200"
                      >
                        <CellValue col={c} value={value} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Mobile card list — Airtable/Notion/Coda's mobile database views all
          replace the grid with a scrollable list of cards (name + a
          handful of glance-able fields as pills), full-width tap targets
          opening the same full-record detail screen used on desktop.
          "Select" mode (toggled in the header above) swaps the tap target
          to a checkbox so batch edit still works with a thumb, reusing the
          exact same bulk-action bar below. */}
      {view === 'members' && (
      <div className="flex md:hidden flex-1 overflow-auto flex-col gap-2 p-3">
        {filtered.map((m) => {
          const id = m.id as number
          const isSelected = selected.has(id)
          const pills = [m.partner, m.connected, m.active, m.campus_preference].filter(Boolean) as string[]
          return (
            <div
              key={id}
              onClick={() => (mobileSelecting ? toggleSelectRow(id) : setOpenId(id))}
              className={`rounded-xl border p-3 flex items-center gap-3 active:opacity-80 ${
                isSelected
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              {mobileSelecting && (
                <input type="checkbox" checked={isSelected} readOnly className="shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">
                  {String(m.name ?? '')}
                  {(m.active === 'disconnected' || m.active === 'deceased') && (
                    <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">Inactive</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {String(m.phone ?? m.email ?? '—')}
                </div>
                {pills.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {pills.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {!mobileSelecting && <span className="text-slate-300 dark:text-slate-600 text-lg shrink-0">›</span>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">No members match.</div>
        )}
      </div>
      )}

      {!mobileSelecting && (
        <button
          onClick={() => setAdding(true)}
          className="md:hidden fixed bottom-6 right-4 z-30 h-12 w-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-2xl leading-none shadow-lg flex items-center justify-center"
          aria-label="Add member"
        >
          +
        </button>
      )}

      {view === 'members' && selected.size > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{selected.size} selected</span>
          <select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue('') }} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            {COLUMNS.filter((c) => !c.readOnly).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          {bulkCol.type === 'select' ? (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <option value="">Set to…</option>
              {bulkCol.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : bulkCol.type === 'bool' ? (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <option value="">Set to…</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              type={bulkCol.type === 'date' ? 'date' : 'text'}
              placeholder="New value"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          )}
          <button onClick={applyBulk} disabled={!bulkValue} className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
            Apply to {selected.size}
          </button>
          <button onClick={deactivateSelected} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">
            Deactivate
          </button>
          {selected.size === 2 && (
            <button
              onClick={() => { setMergeError(null); setMerging(true) }}
              title="Merge these two records into one"
              className="rounded-lg border border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-500 px-3 py-1.5 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              Merge…
            </button>
          )}
          {allSelectedDeactivated && (
            <button
              onClick={deleteSelected}
              title="Permanently delete the selected member(s)"
              className="rounded-lg border border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Delete Permanently
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 dark:text-slate-400 underline">
            Clear
          </button>
        </div>
      )}

      {merging && selected.size === 2 && (() => {
        const ids = Array.from(selected)
        const a = members.find((m) => m.id === ids[0])
        const b = members.find((m) => m.id === ids[1])
        if (!a || !b) {
          setMerging(false)
          return null
        }
        return (
          <MergeConfirm
            pair={[a, b]}
            busy={mergeBusy}
            error={mergeError}
            onCancel={() => { setMerging(false); setMergeError(null) }}
            onConfirm={mergeSelected}
          />
        )
      })()}
    </div>
  )
}
