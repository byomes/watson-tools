import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/scratchAuth'

// Every page under this (gated) route group is auto-protected by the
// shared /cat/scratch PIN -- drop a new folder in here
// (src/app/cat/scratch/(gated)/<name>/page.tsx) and it inherits the gate
// for free, no per-page auth check needed. The route group adds no URL
// segment, so a page at (gated)/connect-review/page.tsx serves at
// /cat/scratch/connect-review.
//
// Convention for anything placed under here: it's a throwaway review
// copy, not a real feature -- noindex, not linked from any nav, no live
// side effects (an API route it posts to should log and return ok rather
// than actually emailing/texting/writing real data -- see
// /api/cat/connect-review/route.ts for the pattern). Delete the folder
// once it's been reviewed and either discarded or ported into the real
// tool it was drafting.
export default async function ScratchGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/cat/scratch/login')
  return <>{children}</>
}
