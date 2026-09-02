'use client'

import { useEffect, useState } from 'react'
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

export default function NotesFeed() {
  const [entries, setEntries] = useState<FeedEntry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/cat/deacons/roster')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const people: Person[] = await res.json()
        const flattened = people.flatMap((p) =>
          p.deacon_notes.map((dn) => ({
            personId: p.id,
            personName: p.name,
            note: dn.note,
            status: dn.status,
            created_at: dn.created_at,
          })),
        )
        flattened.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        if (!cancelled) setEntries(flattened)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load notes')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loadError) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        Could not load notes right now. Try again shortly.
      </p>
    )
  }

  if (!entries) {
    return <p className="text-gray-500 text-sm px-4 py-8">Loading…</p>
  }

  if (entries.length === 0) {
    return <p className="text-gray-500 text-sm px-4 py-8">No deacon notes logged yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((e, i) => (
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
      ))}
    </div>
  )
}
