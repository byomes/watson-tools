'use client'
import { useState } from 'react'

type Bucket = '6wk' | '3-5wk' | '2wk' | null

interface Member {
  name: string
  bucket: Bucket
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
              {group.members.map((m, i) => {
                const meta = BUCKET_META[bucketKey(m.bucket)]
                return (
                  <li
                    key={`${m.name}-${i}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-gray-900 dark:text-gray-100">{m.name}</span>
                    <span
                      className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.className}`}
                    >
                      {meta.label}
                    </span>
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
