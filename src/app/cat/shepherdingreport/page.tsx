import type { Metadata, Viewport } from 'next'
import { requireLiveTool } from '@/lib/requireLiveTool'
import { getShepherdingReport, computeShepherdingTotals } from '@/lib/shepherdingReport'
import { AutoThemeShell } from './AutoThemeShell'
import GroupList from './GroupList'
import ShepherdingStats from './ShepherdingStats'

// statusBarStyle is fixed at 'default' (light/opaque, dark icons) -- iOS
// reads this once at launch for an installed (Add to Home Screen) icon and
// has no live-updating variant, so an installed icon's status bar cannot
// track prefers-color-scheme the way a plain Safari tab's own toolbar can.
// Bill chose fixed-light over fixed-dark 2026-09-06. icon.jpg/apple-icon.jpg
// alongside this file are Next's file-convention icons (same source image
// as cat/deaconapp's) -- auto-linked, no manifest needed.
export const metadata: Metadata = {
  title: 'Catalyst Shepherding Report',
  robots: { index: false, follow: false },
  appleWebApp: { title: 'Shepherding', statusBarStyle: 'default' },
}

// Two static theme-color tags (one per media query) rather than a single JS-
// mutated one -- Safari only honors theme-color as parsed from the initial
// HTML for tinting a regular tab's own address/toolbar chrome, and ignores
// changes made from JS after the page has already rendered. These are
// re-evaluated live by the browser itself as the OS setting changes, no JS
// required. #030712 matches dark:bg-gray-950 used across the site.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
}

// Never statically prerendered — see cat/attendance/page.tsx for why (the
// go-live gate is live DB state, and this page's own data changes weekly).
export const dynamic = 'force-dynamic'

export default async function ShepherdingReportPage() {
  await requireLiveTool('cat', 'shepherdingreport')
  const data = await getShepherdingReport()
  const totals = data ? computeShepherdingTotals(data.groups) : null

  return (
    <AutoThemeShell>
      <div className="min-h-screen bg-white dark:bg-gray-950 py-8 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-1">Catalyst Shepherding Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {data ? `Generated ${data.generated_date}` : 'Report unavailable'} — grouped by deacon,
            most at-risk first in each group.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Tap a weeks-since badge to update someone&apos;s last attendance date.
          </p>

          {!data && (
            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              Could not load the report right now. Try again shortly.
            </p>
          )}

          {totals && data && <ShepherdingStats groups={data.groups} totals={totals} />}

          {data && <GroupList groups={data.groups} />}
        </div>
      </div>
    </AutoThemeShell>
  )
}
