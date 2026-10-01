import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/uploadAuth'

export default async function UploadGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/upload/login')
  return <>{children}</>
}
