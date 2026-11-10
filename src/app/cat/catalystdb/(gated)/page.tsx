import { redirect } from 'next/navigation'

// The Catalyst Database grid page was retired 2026-11-09 (people are edited in 9e9 now).
// The grid components in this folder still power the CHM dashboard, so only the stand-alone page is gone.
export const dynamic = 'force-dynamic'

export default function CatalystDBPage() {
  redirect('/cat/dashboard')
}
