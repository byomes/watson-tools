import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/smsAuth'

export default async function SmsGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/sms/login')
  return <>{children}</>
}
