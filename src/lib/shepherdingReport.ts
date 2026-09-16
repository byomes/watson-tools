// Server-only (imports @/lib/watson) -- 'use client' components should
// import types/compute functions from ./shepherdingReportShared directly.
import { watsonFetch } from '@/lib/watson'
import type { ReportState } from '@/lib/shepherdingReportShared'

export * from '@/lib/shepherdingReportShared'

export async function getShepherdingReport(): Promise<ReportState | null> {
  const res = await watsonFetch('/api/cat/shepherdingreport/state', {
    headers: { 'X-Watson-Key': process.env.SHEPHERDING_REPORT_API_KEY ?? '' },
  })
  if (!res.ok) return null
  return res.json()
}
