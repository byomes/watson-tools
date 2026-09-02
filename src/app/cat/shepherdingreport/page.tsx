import type { Metadata } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getShepherdingReport, computeShepherdingTotals } from '@/lib/shepherdingReport'
import GroupList from './GroupList'

export const metadata: Metadata = {
  title: 'Catalyst Shepherding Report',
  robots: { index: false, follow: false },
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and this page's own data changes weekly).
export const dynamic = 'force-dynamic'

export default async function ShepherdingReportPage() {
  await requireLiveTool('cat', 'shepherdingreport')
  const data = await getShepherdingReport()
  const totals = data ? computeShepherdingTotals(data.groups) : null

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-black mb-1">Catalyst Shepherding Report</h1>
        <p className="text-sm text-gray-500 mb-4">
          {data ? `Generated ${data.generated_date}` : 'Report unavailable'} — grouped by deacon,
          most at-risk first in each group.
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

        {data && <GroupList groups={data.groups} />}
      </div>
    </div>
  )
}
