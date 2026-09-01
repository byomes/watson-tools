import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export const metadata: Metadata = {
  title: 'Elder Shepherding Report',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and this page's own data changes weekly).
export const dynamic = 'force-dynamic'

type Bucket = '6wk' | '3-5wk' | '2wk' | null

interface Member {
  name: string
  bucket: Bucket
}

interface Group {
  name: string
  members: Member[]
}

interface ReportState {
  generated_date: string
  groups: Group[]
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

async function getReport(): Promise<ReportState | null> {
  const res = await watsonFetch('/api/cat/shepherdingreport/state', {
    headers: { 'X-Watson-Key': process.env.SHEPHERDING_REPORT_API_KEY ?? '' },
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ShepherdingReportPage() {
  await requireLiveTool('cat', 'shepherdingreport')
  const data = await getReport()

  const totals = data
    ? data.groups.reduce(
        (acc, g) => {
          for (const m of g.members) {
            if (m.bucket === '6wk') acc.wk6 += 1
            else if (m.bucket === '3-5wk') acc.wk35 += 1
            else if (m.bucket === '2wk') acc.wk2 += 1
          }
          return acc
        },
        { wk2: 0, wk35: 0, wk6: 0 },
      )
    : null

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Elder Shepherding Report</h1>
        <p className="text-sm text-gray-500 mb-4">
          {data ? `Generated ${data.generated_date}` : 'Report unavailable'} — grouped by deacon,
          most at-risk first in each group. Tap a group to expand.
        </p>

        {!data && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Could not load the report right now. Try again shortly.
          </p>
        )}

        {totals && (
          <div className="flex gap-2 mb-6 text-xs font-semibold">
            <span className="flex-1 text-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 py-2">
              2 wks {totals.wk2}
            </span>
            <span className="flex-1 text-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 py-2">
              3-5 wks {totals.wk35}
            </span>
            <span className="flex-1 text-center rounded-md border border-red-300 bg-red-50 text-red-700 py-2">
              6+ wks {totals.wk6}
            </span>
          </div>
        )}

        {data &&
          data.groups.map((group) => {
            const flagged = group.members.filter((m) => m.bucket !== null).length
            return (
              <details
                key={group.name}
                className="mb-3 border border-gray-200 rounded-lg overflow-hidden"
                open={flagged > 0}
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
    </div>
  )
}
