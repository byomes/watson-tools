'use client'

import { useEffect, useState } from 'react'
import { classLabel } from './classLabel'

interface Candidate {
  id: number | null
  member_id?: number
  name: string
  current_class: string | null
}

// Scoped to one class section at a time (see KidsAttendanceBoard's
// addingClass state) -- opened via "+ Add a kid" under that class's roster.
// Two paths to the same POST /api/cat/kidsatt/add call: pick an existing
// kid from a live name search (debounced, 2+ chars, mirrors the >=2-char
// floor search() itself enforces), or fall through to a small new-kid form
// when nobody in the DB matches. Either way the kid ends up present in
// *this* class for the selected service date.
export default function AddKidForm({
  className,
  serviceDate,
  onDone,
  onCancel,
}: {
  className: string
  serviceDate: string
  onDone: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dups, setDups] = useState<Candidate[] | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setCandidates(null)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const res = await fetch(`/api/cat/kidsatt/search?q=${encodeURIComponent(q)}`)
      setSearching(false)
      if (!res.ok) return
      const body = await res.json()
      setCandidates(body.candidates ?? [])
    }, 300)
    return () => {
      clearTimeout(t)
      setSearching(false)
    }
  }, [query])

  async function addExisting(c: Candidate) {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/cat/kidsatt/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(c.id !== null ? { kid_id: c.id } : { member_id: c.member_id }), service_date: serviceDate, class_name: className }),
    })
    setBusy(false)
    if (!res.ok) {
      setError('Could not add this kid. Try again.')
      return
    }
    onDone()
  }

  async function addNew(confirmDuplicate = false) {
    if (!firstName.trim()) {
      setError('First name is required.')
      return
    }
    setBusy(true)
    setError(null)
    const res = await fetch('/api/cat/kidsatt/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        create_new: true,
        confirm_duplicate: confirmDuplicate,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender.trim(),
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
        service_date: serviceDate,
        class_name: className,
      }),
    })
    setBusy(false)
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      if (body.resolution === 'duplicate') {
        setDups(body.candidates ?? [])
        return
      }
    }
    if (!res.ok) {
      setError('Could not add this kid. Try again.')
      return
    }
    onDone()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3 bg-gray-50 dark:bg-gray-900">
      {!showNewForm ? (
        <>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Search kids already in the database
          </label>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name…"
            className="w-full mb-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
          />
          {searching && <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Searching…</p>}
          {candidates && candidates.length > 0 && (
            <ul className="mb-2 divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {candidates.map((c) => (
                <li key={c.id ?? `m${c.member_id}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addExisting(c)}
                    className="w-full text-left px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {c.name}
                    {c.current_class ? (
                      <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">currently in {classLabel(c.current_class)}</span>
                    ) : c.id === null ? (
                      <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">in the church database</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {candidates && candidates.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">No matching kids found.</p>
          )}
          {error && <p className="text-red-600 dark:text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowNewForm(true); setFirstName(query.trim().split(' ')[0] ?? ''); setError(null) }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              Not listed — add a new kid
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="ml-auto text-xs text-gray-500 dark:text-gray-400 underline"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New kid</label>
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name (required)"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="">Gender</option>
              <option value="M">Boy</option>
              <option value="F">Girl</option>
            </select>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Guardian name (optional)"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            />
            <input
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="Guardian phone (optional)"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          {dups && dups.length > 0 && (
            <div className="mb-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 p-2 text-xs text-black dark:text-white">
              <p className="font-medium mb-1">Someone with this name is already on file. Is it the same child?</p>
              <ul className="mb-2 flex flex-col gap-1">
                {dups.map((c) => (
                  <li key={c.id ?? `m${c.member_id}`}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addExisting(c)}
                      className="w-full text-left px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
                    >
                      Yes, add {c.name}
                      {c.current_class && <span className="ml-1 text-gray-400 dark:text-slate-500">({classLabel(c.current_class)})</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy}
                onClick={() => addNew(true)}
                className="underline disabled:opacity-50"
              >
                No, a different child with the same name: add as new
              </button>
            </div>
          )}
          {error && <p className="text-red-600 dark:text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addNew(false)}
              disabled={busy || !firstName.trim()}
              className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? 'Adding…' : `Add to ${classLabel(className)}`}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setError(null); setDups(null) }}
              disabled={busy}
              className="text-xs text-gray-500 dark:text-gray-400 underline"
            >
              Back to search
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="ml-auto text-xs text-gray-500 dark:text-gray-400 underline"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
