import type { Metadata, Viewport } from 'next'
import { getShepcheckReport, type ShepcheckEntry } from '@/lib/shepcheckReport'
import { logoutAction } from '../actions'
import { AutoThemeShell } from './AutoThemeShell'

export const metadata: Metadata = {
  title: 'Shepherding Check-In',
  robots: { index: false, follow: false },
  appleWebApp: { title: 'ShepCheck', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
}

// Live DB state, not prerenderable -- see cat/attendance/page.tsx.
export const dynamic = 'force-dynamic'

// DB timestamps are sqlite datetime('now') strings (UTC, no offset suffix)
// -- append 'Z' so Date parses them as UTC, then render in the church's own
// timezone rather than whatever the rendering server happens to be in.
function formatEastern(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  snoozed: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  escalated: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting contact',
  done: 'Contact logged',
  snoozed: 'Snoozed',
  escalated: 'Escalated to pastor',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function EntryCard({ entry }: { entry: ShepcheckEntry }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="font-semibold text-black dark:text-white">{entry.member_name}</h2>
        <StatusBadge status={entry.status} />
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
        &ldquo;{entry.request_text}&rdquo;
      </p>

      <dl className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>
          <dt className="inline font-medium">Request logged:</dt>{' '}
          <dd className="inline">{entry.request_date ?? '—'}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Sent to {entry.deacon_name ?? 'deacon'}:</dt>{' '}
          <dd className="inline">{formatEastern(entry.sent_at)}</dd>
        </div>
        {entry.status === 'done' && (
          <div>
            <dt className="inline font-medium">Contact logged:</dt>{' '}
            <dd className="inline">{formatEastern(entry.contacted_at)}</dd>
          </div>
        )}
        {entry.status === 'snoozed' && (
          <div>
            <dt className="inline font-medium">Follow-up due:</dt>{' '}
            <dd className="inline">
              {formatEastern(entry.remind_at)} ({entry.snooze_hours}h snooze)
            </dd>
          </div>
        )}
        {entry.status === 'escalated' && (
          <div>
            <dt className="inline font-medium">Escalated:</dt>{' '}
            <dd className="inline">{formatEastern(entry.escalated_at)}</dd>
          </div>
        )}
        {entry.escalation_note && (
          <div>
            <dt className="inline font-medium">Note from {entry.deacon_name ?? 'deacon'}:</dt>{' '}
            <dd className="inline italic">&ldquo;{entry.escalation_note}&rdquo;</dd>
          </div>
        )}
      </dl>

      {entry.escalation && (
        <div className="mt-3 pl-3 border-l-2 border-red-300 dark:border-red-800">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">Pastor Bill&apos;s follow-up</span>
            <StatusBadge status={entry.escalation.status} />
          </div>
          <dl className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>
              <dt className="inline font-medium">Notified:</dt>{' '}
              <dd className="inline">{formatEastern(entry.escalation.sent_at)}</dd>
            </div>
            {entry.escalation.status === 'done' && (
              <div>
                <dt className="inline font-medium">Contact logged:</dt>{' '}
                <dd className="inline">{formatEastern(entry.escalation.contacted_at)}</dd>
              </div>
            )}
            {entry.escalation.status === 'snoozed' && (
              <div>
                <dt className="inline font-medium">Follow-up due:</dt>{' '}
                <dd className="inline">{formatEastern(entry.escalation.remind_at)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}

export default async function ShepcheckPage() {
  const entries = await getShepcheckReport()

  return (
    <AutoThemeShell>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-black dark:text-white">Shepherding Check-In</h1>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 underline">
                Log out
              </button>
            </form>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Prayer requests from the last 7 days, deacon notification, and follow-up.
          </p>

          {entries === null && (
            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              Could not load the report right now. Try again shortly.
            </p>
          )}

          {entries !== null && entries.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No prayer requests sent to deacons in the last 7 days.</p>
          )}

          {entries !== null && entries.length > 0 && (
            <div className="space-y-4">
              {entries.map((entry) => (
                <EntryCard key={entry.log_id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AutoThemeShell>
  )
}
