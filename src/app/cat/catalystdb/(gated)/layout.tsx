import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/catalystdbAuth'

export default async function CatalystDBGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/cat/catalystdb/login')
  return <>{children}</>
}
