import { redirect } from 'next/navigation'
import { getFmsUser } from '@/lib/fmsAuth'
import { fmsLogoutAction } from './actions'
import FmsMoneyApp from './FmsMoneyApp'

export const dynamic = 'force-dynamic'

export default async function FmsMoneyPage() {
  const user = await getFmsUser()
  if (!user) redirect('/fmsmoney/login')
  return (
    <FmsMoneyApp
      user={user}
      logout={
        <form action={fmsLogoutAction}>
          <button type="submit" className="text-sm text-slate-500 dark:text-slate-400 hover:underline">Sign out</button>
        </form>
      }
    />
  )
}
