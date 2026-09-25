import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/shepcheckAuth'

// Every page under this (gated) route group is auto-protected by the
// per-person /cat/shepcheck elder PIN. Route group adds no URL segment, so
// this covers /cat/shepcheck itself.
export default async function ShepcheckGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/cat/shepcheck/login')
  return <>{children}</>
}
