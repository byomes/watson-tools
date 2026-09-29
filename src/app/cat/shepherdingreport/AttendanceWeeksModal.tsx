'use client'
import { useEffect, useState } from 'react'
import type { AttendanceWeek } from '@/lib/shepherdingReportShared'

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
}: {
  memberId: number
  memberName: string
  onClose: () => void
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

        <div className="px-4 py-5">
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
                        w.present
                          ? 'h-full bg-green-500 dark:bg-green-500 border-green-600 dark:border-green-500'
                          : 'h-2 bg-transparent border-dashed border-gray-300 dark:border-gray-600'
                      }`}
                      role="img"
                      aria-label={`${shortDate(w.service_date)}: ${w.present ? 'present' : 'absent'}`}
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                      {shortDate(w.service_date)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
