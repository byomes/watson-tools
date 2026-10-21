import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/chiunitedAuth'

export default async function ChiUnitedGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/chiunited/login')
  return <>{children}</>
}
