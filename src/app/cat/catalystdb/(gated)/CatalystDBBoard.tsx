'use client'

import { useEffect, useMemo, useState } from 'react'
import { COLUMNS, FILTERABLE, type Col } from './columns'
import MemberDetail from './MemberDetail'

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
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [visible, setVisible] = useState(DEFAULT_VISIBLE)
  const [showColPicker, setShowColPicker] = useState(false)
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

  useEffect(() => {
    api('state')
      .then((d) => setMembers(d.members))
      .catch((e) => setError(String(e.message ?? e)))
  }, [])

  const filtered = useMemo(() => {
    if (!members) return []
    const q = search.trim().toLowerCase()
    let rows = members.filter((m) => {
      if (q) {
        const hay = `${m.name ?? ''} ${m.email ?? ''} ${m.phone ?? ''} ${m.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      for (const [key, val] of Object.entries(filters)) {
        if (!val) continue
        const cur = String(m[key] ?? '')
        if (val === '__active__' && cur !== '1') return false
        if (val === '__inactive__' && cur === '1') return false
        if (val !== '__active__' && val !== '__inactive__' && cur !== val) return false
      }
      return true
    })
    rows = rows.slice().sort((a, b) => {
      const av = sort.key === 'name' ? lastNameKey(String(a.name ?? '')) : a[sort.key] ?? ''
      const bv = sort.key === 'name' ? lastNameKey(String(b.name ?? '')) : b[sort.key] ?? ''
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
    return rows
  }, [members, search, filters, sort])

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
    setMembers((m) => m && m.map((row) => (ids.includes(row.id as number) ? { ...row, active: 0 } : row)))
    try {
      await api('deactivate', { ids })
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
    setMembers((m) => m && m.map((row) => (row.id === id ? { ...row, active: 0 } : row)))
    try {
      await api('deactivate', { ids: [id] })
      setOpenId(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
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
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Desktop header — full filter row + column picker. Hidden below md;
          see the mobile header block right after this for the small-screen
          equivalent (search + a collapsible filter sheet instead). */}
      <div className="hidden md:flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white shrink-0">Catalyst Database</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, notes…"
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {FILTERABLE.map((c) => (
          <select
            key={c.key}
            value={filters[c.key] ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300"
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
        <div className="relative">
          <button
            onClick={() => setShowColPicker((s) => !s)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 mt-1 w-56 max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20 p-2">
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
          onClick={() => setAdding(true)}
          className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-semibold hover:opacity-90 shrink-0"
        >
          + Add Member
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{filtered.length} of {members.length}</span>
      </div>

      {/* Mobile header — card-list conventions from Airtable/Notion/Coda's
          mobile apps: a persistent search bar, filters tucked into a
          collapsible sheet (not a cramped row of selects), a "Select" mode
          toggle instead of always-visible checkboxes, and a floating "+"
          button below rather than an inline one competing for header space. */}
      <div className="flex md:hidden flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex-1">Catalyst DB</h1>
          <button
            onClick={() => setMobileSelecting((s) => !s)}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 py-1"
          >
            {mobileSelecting ? 'Cancel' : 'Select'}
          </button>
          <button
            onClick={() => setMobileFiltersOpen((s) => !s)}
            className="relative rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Filters
            {Object.values(filters).some(Boolean) && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
        <div className="px-4 pb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
        {mobileFiltersOpen && (
          <div className="px-4 pb-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center gap-2">
              <select
                value={sort.key}
                onChange={(e) => setSort((s) => ({ ...s, key: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                {['name', 'partner', 'connected', 'active_v2', 'campus_preference', 'deacon'].map((k) => (
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
            <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} of {members.length}</span>
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

      {/* Desktop grid */}
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

      {/* Mobile card list — Airtable/Notion/Coda's mobile database views all
          replace the grid with a scrollable list of cards (name + a
          handful of glance-able fields as pills), full-width tap targets
          opening the same full-record detail screen used on desktop.
          "Select" mode (toggled in the header above) swaps the tap target
          to a checkbox so batch edit still works with a thumb, reusing the
          exact same bulk-action bar below. */}
      <div className="flex md:hidden flex-1 overflow-auto flex-col gap-2 p-3">
        {filtered.map((m) => {
          const id = m.id as number
          const isSelected = selected.has(id)
          const pills = [m.partner, m.connected, m.active_v2, m.campus_preference].filter(Boolean) as string[]
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
                  {(m.active_v2 === 'disconnected' || m.active_v2 === 'deceased') && (
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

      {!mobileSelecting && (
        <button
          onClick={() => setAdding(true)}
          className="md:hidden fixed bottom-6 right-4 z-30 h-12 w-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-2xl leading-none shadow-lg flex items-center justify-center"
          aria-label="Add member"
        >
          +
        </button>
      )}

      {selected.size > 0 && (
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
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 dark:text-slate-400 underline">
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
