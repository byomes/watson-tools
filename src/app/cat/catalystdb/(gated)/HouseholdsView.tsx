'use client'

import { useMemo, useState } from 'react'
import { COLUMNS } from './columns'

type Member = Record<string, string | number | null>

const ROLE_OPTIONS = COLUMNS.find((c) => c.key === 'household_role')?.options ?? []

// head/husband lead a household card, then wife/widow(er), then kids, then
// anything unset -- mirrors how a family is naturally introduced.
const ROLE_RANK: Record<string, number> = { head: 0, husband: 0, wife: 1, widow: 1, widower: 1, child: 2 }
function roleRank(role: string | number | null): number {
  const r = String(role ?? '').toLowerCase()
  return r in ROLE_RANK ? ROLE_RANK[r] : 3
}

function lastName(name: string): string {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : name || ''
}

// Households have no separate table -- household_id is just a shared text
// value on members rows -- so there's no stored household name. Derive one
// from the distinct surnames actually in the group instead (blended
// families keep their real distinct surnames rather than being forced to
// pick one -- see memory: household surname mismatches are often correct).
function householdTitle(members: Member[]): string {
  const surnames = Array.from(new Set(members.map((m) => lastName(String(m.name ?? '')).toLowerCase())))
    .filter(Boolean)
    .sort()
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  return surnames.length ? surnames.join(' & ') : '(no name)'
}

function nextHouseholdId(members: Member[]): string {
  let max = 0
  for (const m of members) {
    const match = /^H(\d+)$/i.exec(String(m.household_id ?? ''))
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }
  return `H${String(max + 1).padStart(3, '0')}`
}

function hasHousehold(m: Member): boolean {
  return String(m.household_id ?? '').trim() !== ''
}

async function api(path: string, body?: unknown) {
  const res = await fetch(`/api/cat/catalystdb/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`)
  return res.json()
}

// Add, move, and remove are all the same underlying action -- writing a
// member's household_id -- so one "Household" dropdown per row handles all
// three: pick an existing household to add/move into, "— Unassigned —" to
// remove, or "+ New household" to start one right there. A second dropdown
// next to it edits household_role the same click-to-set way the main grid
// already edits every other select-type column.
export default function HouseholdsView({
  members,
  search,
  setMembers,
  setError,
  onOpenMember,
}: {
  members: Member[]
  search: string
  setMembers: React.Dispatch<React.SetStateAction<Member[] | null>>
  setError: (msg: string) => void
  onOpenMember: (id: number) => void
}) {
  const [busy, setBusy] = useState<Set<number>>(new Set())

  async function setField(id: number, field: 'household_id' | 'household_role', value: string) {
    setBusy((b) => new Set(b).add(id))
    setMembers((ms) => ms && ms.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
    try {
      await api('update', { ids: [id], field, value })
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(id)
        return next
      })
    }
  }

  const groups = useMemo(() => {
    const byId = new Map<string, Member[]>()
    for (const m of members) {
      if (!hasHousehold(m)) continue
      const id = String(m.household_id)
      if (!byId.has(id)) byId.set(id, [])
      byId.get(id)!.push(m)
    }
    const list = Array.from(byId.entries()).map(([id, mem]) => ({
      id,
      title: householdTitle(mem),
      members: mem.slice().sort((a, b) => {
        const r = roleRank(a.household_role) - roleRank(b.household_role)
        return r !== 0 ? r : lastName(String(a.name ?? '')).localeCompare(lastName(String(b.name ?? '')))
      }),
    }))
    list.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    return list
  }, [members])

  const unassigned = useMemo(
    () =>
      members
        .filter((m) => !hasHousehold(m))
        .slice()
        .sort((a, b) => lastName(String(a.name ?? '')).localeCompare(lastName(String(b.name ?? '')))),
    [members]
  )

  // Built from the full member list (not the search-filtered view below) so
  // the dropdown's choices don't shrink just because you're searching.
  const householdOptions = useMemo(() => groups.map((g) => ({ id: g.id, label: `${g.id} — ${g.title}` })), [groups])

  const q = search.trim().toLowerCase()
  const matches = (m: Member) => !q || String(m.name ?? '').toLowerCase().includes(q)
  const groupMatches = (g: (typeof groups)[number]) =>
    !q || g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q) || g.members.some(matches)

  function HouseholdSelect({ member }: { member: Member }) {
    const id = member.id as number
    return (
      <select
        value={String(member.household_id ?? '')}
        disabled={busy.has(id)}
        onChange={(e) => {
          const v = e.target.value
          setField(id, 'household_id', v === '__new__' ? nextHouseholdId(members) : v)
        }}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50"
      >
        <option value="">— Unassigned —</option>
        {householdOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        <option value="__new__">+ New household</option>
      </select>
    )
  }

  function RoleSelect({ member }: { member: Member }) {
    const id = member.id as number
    return (
      <select
        value={String(member.household_role ?? '')}
        disabled={busy.has(id)}
        onChange={(e) => setField(id, 'household_role', e.target.value)}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50"
      >
        <option value="">Role: —</option>
        {ROLE_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  function MemberRow({ member }: { member: Member }) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
        <button
          onClick={() => onOpenMember(member.id as number)}
          className="flex-1 min-w-[140px] text-left text-sm text-slate-900 dark:text-white hover:underline truncate"
        >
          {String(member.name ?? '')}
        </button>
        <RoleSelect member={member} />
        <HouseholdSelect member={member} />
      </div>
    )
  }

  const visibleGroups = groups.filter(groupMatches)
  const visibleUnassigned = unassigned.filter(matches)

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Use the dropdowns on each row to add, move, or remove someone from a household, and to set their role.
        Picking “+ New household” starts a new one with that person.
      </p>

      {visibleGroups.map((g) => (
        <div
          key={g.id}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shrink-0"
        >
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{g.title}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {g.id} · {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {g.members.map((m) => (
            <MemberRow key={m.id as number} member={m} />
          ))}
        </div>
      ))}

      {visibleUnassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shrink-0">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Unassigned</span>
            <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
              {visibleUnassigned.length} {visibleUnassigned.length === 1 ? 'member' : 'members'} not in a household
            </span>
          </div>
          {visibleUnassigned.map((m) => (
            <MemberRow key={m.id as number} member={m} />
          ))}
        </div>
      )}

      {visibleGroups.length === 0 && visibleUnassigned.length === 0 && (
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">No members match.</div>
      )}
    </div>
  )
}
