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

// Households have no separate table -- household_id (and now household_name)
// are just shared text values duplicated onto every member row with that id,
// the same non-normalized convention household_id already used. Falls back
// to the distinct surnames actually in the group when no one's set a custom
// name yet (blended families keep their real distinct surnames rather than
// being forced to pick one -- see memory: household surname mismatches are
// often correct).
function defaultHouseholdTitle(members: Member[]): string {
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

type Field = 'household_id' | 'household_role' | 'household_name'

function EditableTitle({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="Click to rename"
        className="text-sm font-semibold text-slate-900 dark:text-white hover:underline text-left truncate"
      >
        {value}
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        setEditing(false)
        onSave(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="text-sm font-semibold bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 text-slate-900 dark:text-white min-w-0"
    />
  )
}

// Add, move, and remove are all the same underlying action -- writing a
// member's household_id (and, to keep a renamed household's title correct,
// household_name alongside it) -- so one "Household" dropdown per row
// handles all three: pick an existing household to add/move into, "—
// Unassigned —" to remove, or "+ New household" to start one right here. A
// second dropdown edits household_role the same click-to-set way the main
// grid already edits every other select-type column. Each household card
// also gets a typeahead search to add someone without hunting through that
// dropdown's full list, and a click-to-rename title.
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

  async function setField(id: number, field: Field, value: string) {
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

  async function setFieldMany(ids: number[], field: Field, value: string) {
    if (ids.length === 0) return
    setBusy((b) => {
      const next = new Set(b)
      ids.forEach((id) => next.add(id))
      return next
    })
    setMembers((ms) => ms && ms.map((m) => (ids.includes(m.id as number) ? { ...m, [field]: value } : m)))
    try {
      await api('update', { ids, field, value })
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        ids.forEach((id) => next.delete(id))
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
    const list = Array.from(byId.entries()).map(([id, mem]) => {
      const customName = mem.map((m) => String(m.household_name ?? '').trim()).find(Boolean) ?? ''
      return {
        id,
        customName,
        title: customName || defaultHouseholdTitle(mem),
        members: mem.slice().sort((a, b) => {
          const r = roleRank(a.household_role) - roleRank(b.household_role)
          return r !== 0 ? r : lastName(String(a.name ?? '')).localeCompare(lastName(String(b.name ?? '')))
        }),
      }
    })
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
  const customNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.customName])), [groups])

  // Whatever household a member lands in (existing, brand new, or none),
  // household_name gets rewritten to match -- otherwise a member carrying a
  // stale custom name from a household they just left could wrongly supply
  // the title for whatever group they land in next (title picks the first
  // non-empty household_name among a group's members).
  async function assignHousehold(memberId: number, target: string) {
    const finalId = target === '__new__' ? nextHouseholdId(members) : target
    const finalName = finalId ? customNameById.get(finalId) ?? '' : ''
    await Promise.all([setField(memberId, 'household_id', finalId), setField(memberId, 'household_name', finalName)])
  }

  async function renameHousehold(memberIds: number[], currentCustomName: string, nextName: string) {
    const trimmed = nextName.trim()
    if (trimmed === currentCustomName) return
    await setFieldMany(memberIds, 'household_name', trimmed)
  }

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
        onChange={(e) => assignHousehold(id, e.target.value)}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50"
      >
        <option value="">— Unassigned —</option>
        <option value="__new__">+ New household</option>
        {householdOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
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

  function AddMemberSearch({ groupId }: { groupId: string }) {
    const [q2, setQ2] = useState('')
    const results = useMemo(() => {
      const query = q2.trim().toLowerCase()
      if (!query) return []
      return members
        .filter((m) => String(m.household_id ?? '') !== groupId)
        .filter((m) => String(m.name ?? '').toLowerCase().includes(query))
        .slice(0, 8)
    }, [q2, groupId])

    return (
      // Results render inline (not as an absolute overlay) -- the card
      // above needs overflow-hidden for its rounded corners, which would
      // silently clip an absolutely-positioned dropdown right out of view.
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <input
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          placeholder="+ Add member…"
          className="w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 placeholder:text-slate-400"
        />
        {results.length > 0 && (
          <div className="mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            {results.map((m) => (
              <button
                key={m.id as number}
                onClick={() => {
                  assignHousehold(m.id as number, groupId)
                  setQ2('')
                }}
                className="flex w-full items-center justify-between gap-2 text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className="truncate">{String(m.name ?? '')}</span>
                {hasHousehold(m) && <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">moves from another household</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const visibleGroups = groups.filter(groupMatches)
  const visibleUnassigned = unassigned.filter(matches)

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Click a household&rsquo;s name to rename it. Use the dropdowns on each row to add, move, or remove someone
        and to set their role, or use a household&rsquo;s search box below its members to add someone by name.
      </p>

      {visibleGroups.map((g) => (
        <div
          key={g.id}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shrink-0"
        >
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <EditableTitle value={g.title} onSave={(next) => renameHousehold(g.members.map((m) => m.id as number), g.customName, next)} />
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
              {g.id} · {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {g.members.map((m) => (
            <MemberRow key={m.id as number} member={m} />
          ))}
          <AddMemberSearch groupId={g.id} />
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
