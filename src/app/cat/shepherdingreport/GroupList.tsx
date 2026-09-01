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
  '6wk': { label: '6+ wks', className: 'text-red-700 bg-red-50 border-red-300' },
  '3-5wk': { label: '3-5 wks', className: 'text-amber-700 bg-amber-50 border-amber-300' },
  '2wk': { label: '2 wks', className: 'text-blue-700 bg-blue-50 border-blue-300' },
  current: { label: 'Current', className: 'text-gray-500 bg-gray-50 border-gray-200' },
}

function bucketKey(bucket: Bucket): string {
  return bucket ?? 'current'
}

export default function GroupList({ groups }: { groups: Group[] }) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.name, g.members.some((m) => m.bucket !== null)])),
  )

  const setAll = (open: boolean) => {
    setOpenMap(Object.fromEntries(groups.map((g) => [g.name, open])))
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="flex-1 rounded-md border border-gray-300 text-gray-700 py-2 active:bg-gray-100"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="flex-1 rounded-md border border-gray-300 text-gray-700 py-2 active:bg-gray-100"
        >
          Collapse all
        </button>
      </div>

      {groups.map((group) => {
        const flagged = group.members.filter((m) => m.bucket !== null).length
        return (
          <details
            key={group.name}
            className="mb-3 border border-gray-200 rounded-lg overflow-hidden"
            open={openMap[group.name]}
            onToggle={(e) =>
              setOpenMap((prev) => ({ ...prev, [group.name]: e.currentTarget.open }))
            }
          >
            <summary className="cursor-pointer select-none list-none px-4 py-3 bg-gray-50 flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>{group.name}</span>
              <span className="text-xs font-normal text-gray-500">
                {group.members.length}
                {flagged > 0 ? ` · ${flagged} flagged` : ''}
              </span>
            </summary>
            <ul className="divide-y divide-gray-100">
              {group.members.map((m, i) => {
                const meta = BUCKET_META[bucketKey(m.bucket)]
                return (
                  <li
                    key={`${m.name}-${i}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-gray-900">{m.name}</span>
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
