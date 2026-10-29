'use client'
import { useEffect, useState } from 'react'
import type { AttendanceWeek } from '@/lib/shepherdingReportShared'
import { formatDeaconNoteDate } from '@/lib/deaconNotes'
import { notifyDssChanged } from '@/lib/dssSync'

interface DeaconNote {
  id: number
  note: string
  created_at: string
  author_deacon: string | null
}

// service_date is a plain "YYYY-MM-DD" string -- parsed via new Date() that
// gets treated as UTC midnight and can print a day early in US timezones
// once toLocaleDateString renders it back in local time. Splitting the
// string avoids that shift entirely.
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

// Same bottom-sheet-on-mobile / centered-card-on-desktop modal chrome as
// DeaconBoard.tsx's family-relationship trays, so this reads as the same
// app rather than a bolted-on popup.
export default function AttendanceWeeksModal({
  memberId,
  memberName,
  onClose,
  showNotes,
}: {
  memberId: number
  memberName: string
  onClose: () => void
  // Deacon app only: the standalone report page has no deacon session to read or write notes with.
  showNotes?: boolean
}) {
  const [weeks, setWeeks] = useState<AttendanceWeek[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/cat/shepherdingreport/weeks/${memberId}`)
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setWeeks(data.weeks)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [memberId])

  const [notes, setNotes] = useState<DeaconNote[] | null>(null)
  const [notesError, setNotesError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    if (!showNotes) return
    let cancelled = false
    fetch(`/api/cat/deacons/member/${memberId}/notes`)
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data: DeaconNote[]) => {
        if (!cancelled) setNotes(data)
      })
      .catch(() => {
        if (!cancelled) setNotesError(true)
      })
    return () => {
      cancelled = true
    }
  }, [memberId, showNotes])

  async function saveNote() {
    const note = draft.trim()
    if (!note || saving) return
    setSaving(true)
    setSaveError(false)
    try {
      const res = await fetch(`/api/cat/deacons/member/${memberId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) throw new Error('failed')
      const created: DeaconNote = await res.json()
      notifyDssChanged()
      setNotes((prev) => [created, ...(prev ?? [])])
      setDraft('')
      setAdding(false)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const presentCount = weeks?.filter((w) => w.present).length ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-gray-900 border-t-2 sm:border-2 border-gray-200 dark:border-gray-700 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate pr-2">{memberName}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 py-5 overflow-y-auto">
          {error && (
            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
              Could not load attendance right now. Try again shortly.
            </p>
          )}

          {!error && !weeks && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Loading…</p>
          )}

          {weeks && weeks.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No attendance history on file yet.</p>
          )}

          {weeks && weeks.length > 0 && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Present {presentCount} of the last {weeks.length} Sundays with recorded attendance.
              </p>
              <div className="flex items-end justify-between gap-1.5 h-28">
                {weeks.map((w) => (
                  <div key={w.service_date} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                    <div
                      className={`w-full rounded-md border ${
                        w.campus === 'Online'
                          ? 'h-full bg-blue-500 dark:bg-blue-500 border-blue-600 dark:border-blue-400'
                          : w.campus === 'Wilmington'
                            ? 'h-full bg-green-500 dark:bg-green-500 border-green-600 dark:border-green-500'
                            : 'h-2 bg-transparent border-dashed border-gray-300 dark:border-gray-600'
                      }`}
                      role="img"
                      aria-label={`${shortDate(w.service_date)}: ${w.campus ? w.campus : 'absent'}`}
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                      {shortDate(w.service_date)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500 dark:bg-green-500 border border-green-600 dark:border-green-500" />
                  Wilmington
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 dark:bg-blue-500 border border-blue-600 dark:border-blue-400" />
                  Online
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-transparent border border-dashed border-gray-300 dark:border-gray-600" />
                  Absent
                </span>
              </div>
            </>
          )}

          {showNotes && (
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
                {!adding && (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-nine text-white active:opacity-80"
                  >
                    Add a note
                  </button>
                )}
              </div>

              {adding && (
                <div className="mb-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder={`Note about ${memberName}`}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm p-2"
                  />
                  {saveError && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">Could not save the note. Try again.</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={saving || !draft.trim()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-nine text-white disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save note'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false)
                        setDraft('')
                        setSaveError(false)
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {notesError && (
                <p className="text-xs text-red-700 dark:text-red-300">Could not load notes right now.</p>
              )}
              {!notesError && !notes && <p className="text-xs text-gray-400 dark:text-gray-500">Loading notes…</p>}
              {notes && notes.length === 0 && !adding && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No notes yet.</p>
              )}
              {notes && notes.length > 0 && (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5">
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{n.note}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        {n.author_deacon ? `${n.author_deacon} · ` : ''}
                        {formatDeaconNoteDate(n.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
