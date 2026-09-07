'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Bucket = '6wk' | '3-5wk' | '2wk' | null

interface Member {
  id: number
  name: string
  bucket: Bucket
  days_since: number
  last_seen: string
  email: string | null
  phone: string | null
}

interface Group {
  name: string
  members: Member[]
}

// Mirrors jobs/congregation/elder_shepherding_report.py's bucket labels.
const BUCKET_META: Record<string, { label: string; className: string }> = {
  '6wk': { label: '6+ wks', className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800' },
  '3-5wk': { label: '3-5 wks', className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
  '2wk': { label: '2 wks', className: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' },
  current: { label: 'Current', className: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
}

function bucketKey(bucket: Bucket): string {
  return bucket ?? 'current'
}

// members.phone is stored formatted, e.g. "(302) 559-3728" -- tel:/sms:
// links need bare digits. Assume 10-digit US numbers (the only kind on
// file) and prefix +1 so it dials correctly regardless of device locale.
function telHref(scheme: 'tel' | 'sms', phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.length === 10 ? `+1${digits}` : digits
  return `${scheme}:${number}`
}

const iconClass = 'w-5 h-5'

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465a1 1 0 0 1 1.51-.058l1.412 1.412a1 1 0 0 1 0 1.415l-1.5 1.5a2 2 0 0 1-1.995.483C10.752 19.183 4.817 13.248 3.448 8.973a2 2 0 0 1 .483-1.995l1.5-1.5a1 1 0 0 1 1.415 0l1.412 1.412a1 1 0 0 1-.058 1.51l-.465.355a1 1 0 0 0-.303 1.213 12.02 12.02 0 0 0 6.4 6.4Z" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
      <path d="M4 19v-2H2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8Z" />
    </svg>
  )
}

function ContactIcons({ member }: { member: Member }) {
  if (!member.phone && !member.email) return null
  return (
    <span className="flex items-center gap-4 shrink-0 text-gray-400 dark:text-gray-500">
      {member.phone && (
        <>
          <a
            href={telHref('tel', member.phone)}
            aria-label={`Call ${member.name}`}
            className="p-1.5 -m-1.5 active:text-blue-600 dark:active:text-blue-400"
          >
            <PhoneIcon />
          </a>
          <a
            href={telHref('sms', member.phone)}
            aria-label={`Text ${member.name}`}
            className="p-1.5 -m-1.5 active:text-blue-600 dark:active:text-blue-400"
          >
            <TextIcon />
          </a>
        </>
      )}
      {member.email && (
        <a
          href={`mailto:${member.email}`}
          aria-label={`Email ${member.name}`}
          className="p-1.5 -m-1.5 active:text-blue-600 dark:active:text-blue-400"
        >
          <MailIcon />
        </a>
      )}
    </span>
  )
}

function weeksLabel(daysSince: number): string {
  const weeks = Math.floor(daysSince / 7)
  return `${weeks} wk${weeks === 1 ? '' : 's'}`
}

const todayIso = () => new Date().toISOString().slice(0, 10)

// Shows the exact week count (not the coarse bucket range) as a tappable
// label wired to a same-origin, visually-hidden <input type="date"> via
// its `for`/`id` pairing -- tapping the label focuses the input and opens
// the OS date picker, same as tapping the input directly, without needing
// to fight styling a native date input to look like the pill badges used
// elsewhere here. On a picked date, POSTs to the Next.js proxy route
// (jobs/congregation/elder_shepherding_report_web.py's set_last_seen
// inserts an attendance row for that date -- "last seen" is derived, not
// stored) and refreshes the server data so the row's bucket/count reflect
// the correction immediately.
function LastSeenBadge({ member, className, idleLabel }: { member: Member; className: string; idleLabel?: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const inputId = `lastseen-${member.id}`

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const serviceDate = e.target.value
    if (!serviceDate) return
    setStatus('saving')
    try {
      const res = await fetch('/api/cat/shepherdingreport/lastseen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id, service_date: serviceDate }),
      })
      if (!res.ok) throw new Error('save failed')
      setStatus('idle')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <span className="flex flex-col items-end shrink-0">
      <label
        htmlFor={inputId}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer underline decoration-dotted underline-offset-2 ${className}`}
      >
        {status === 'saving' ? 'Saving…' : (idleLabel ?? weeksLabel(member.days_since))}
      </label>
      <input
        id={inputId}
        type="date"
        className="sr-only"
        defaultValue={member.last_seen}
        max={todayIso()}
        onChange={handleChange}
      />
      {status === 'error' && (
        <span className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">Couldn&apos;t save</span>
      )}
    </span>
  )
}

// Bulk expand/collapse remounts each <details> with a fresh defaultOpen via
// a changed key, instead of trying to drive the native `open` attribute as
// a controlled prop -- that pattern fights the browser's own `toggle` event
// (which fires even on a programmatic open change) and crashes once the two
// updates race. Remounting sidesteps the race entirely, and a plain
// uncontrolled <details> still lets a tap on any one summary work natively
// in between bulk actions.
export default function GroupList({ groups }: { groups: Group[] }) {
  const [bulk, setBulk] = useState<{ open: boolean; gen: number } | null>(null)

  const setAll = (open: boolean) => {
    setBulk((prev) => ({ open, gen: (prev?.gen ?? 0) + 1 }))
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 active:bg-gray-100 dark:active:bg-gray-800"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 active:bg-gray-100 dark:active:bg-gray-800"
        >
          Collapse all
        </button>
      </div>

      {groups.map((group) => {
        const flagged = group.members.filter((m) => m.bucket !== null).length
        const initialOpen = bulk ? bulk.open : flagged > 0
        return (
          <details
            key={bulk ? `${group.name}-${bulk.gen}` : group.name}
            className="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            open={initialOpen}
          >
            <summary className="cursor-pointer select-none list-none px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100">
              <span>{group.name}</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {group.members.length}
                {flagged > 0 ? ` · ${flagged} flagged` : ''}
              </span>
            </summary>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {group.members.map((m) => {
                const meta = BUCKET_META[bucketKey(m.bucket)]
                return (
                  <li
                    key={m.id}
                    className="px-4 py-4 flex items-center gap-3 text-sm"
                  >
                    <span className="flex-1 min-w-0 truncate text-gray-900 dark:text-gray-100">{m.name}</span>
                    <ContactIcons member={m} />
                    <LastSeenBadge member={m} className={meta.className} idleLabel={m.bucket === null ? meta.label : undefined} />
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
