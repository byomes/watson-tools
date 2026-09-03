'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDeaconNoteDate } from '@/lib/deaconNotes'

interface DeaconNote {
  note: string
  status: string
  created_at: string
}

interface Person {
  id: number
  name: string
  deacon_notes: DeaconNote[]
}

interface FeedEntry {
  personId: number
  personName: string
  note: string
  status: string
  created_at: string
}

type FormState = 'idle' | 'saving' | 'saved' | 'error'

function sortNewestFirst(entries: FeedEntry[]): FeedEntry[] {
  return [...entries].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

function LogFollowUpForm({
  people,
  onSubmit,
}: {
  people: Person[]
  onSubmit: (personId: number, note: string) => Promise<boolean>
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<FormState>('idle')

  const selectedName = useMemo(
    () => people.find((p) => p.id === selectedId)?.name ?? null,
    [people, selectedId],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || selectedId) return []
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [people, query, selectedId])

  function pickPerson(p: Person) {
    setSelectedId(p.id)
    setQuery(p.name)
  }

  function clearPerson() {
    setSelectedId(null)
    setQuery('')
  }

  async function submit() {
    const trimmed = note.trim()
    if (!selectedId || !trimmed) return
    setState('saving')
    const ok = await onSubmit(selectedId, trimmed)
    if (ok) {
      setNote('')
      clearPerson()
      setState('saved')
      setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } else {
      setState('error')
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 bg-white mb-4">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Log a follow-up
      </label>

      <div className="relative">
        <input
          type="text"
          value={selectedName ?? query}
          onChange={(e) => {
            setSelectedId(null)
            setQuery(e.target.value)
          }}
          placeholder="Search person by name…"
          className="w-full bg-white border-2 border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
        />
        {selectedId && (
          <button
            type="button"
            onClick={clearPerson}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            Change
          </button>
        )}
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPerson(p)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Called, texted, visited…"
        className="w-full mt-2 bg-white border-2 border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
      />

      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={!selectedId || !note.trim() || state === 'saving'}
          className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-700 rounded-lg px-3 py-1.5 disabled:opacity-40"
        >
          {state === 'saving' ? 'Saving…' : 'Log Note'}
        </button>
        {state === 'saved' && <span className="text-xs text-green-700 font-semibold">Saved ✓</span>}
        {state === 'error' && <span className="text-xs text-red-700 font-semibold">Failed — try again</span>}
      </div>
    </div>
  )
}

export default function NotesFeed() {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [entries, setEntries] = useState<FeedEntry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/cat/deacons/roster')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Person[] = await res.json()
        const flattened = data.flatMap((p) =>
          p.deacon_notes.map((dn) => ({
            personId: p.id,
            personName: p.name,
            note: dn.note,
            status: dn.status,
            created_at: dn.created_at,
          })),
        )
        if (!cancelled) {
          setPeople(data)
          setEntries(sortNewestFirst(flattened))
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load notes')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function submitFollowUp(personId: number, note: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/cat/deacons/member/${personId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) return false
      const created: DeaconNote = await res.json()
      const personName = people?.find((p) => p.id === personId)?.name ?? ''
      setEntries((prev) =>
        sortNewestFirst([
          { personId, personName, note: created.note, status: created.status, created_at: created.created_at },
          ...(prev ?? []),
        ]),
      )
      return true
    } catch {
      return false
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        Could not load notes right now. Try again shortly.
      </p>
    )
  }

  if (!entries || !people) {
    return <p className="text-gray-500 text-sm px-4 py-8">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <LogFollowUpForm people={people} onSubmit={submitFollowUp} />

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm px-4 py-8">No deacon notes logged yet.</p>
      ) : (
        entries.map((e, i) => (
          <div key={i} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-gray-900">{e.personName}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDeaconNoteDate(e.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-800 mt-1">
              {e.note}
              {e.status !== 'open' && <span className="text-gray-400"> · {e.status}</span>}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
