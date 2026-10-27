import { redirect } from 'next/navigation'
import { getFmsUser } from '@/lib/fmsAuth'
import LoginForm from './login-form'

export const dynamic = 'force-dynamic'

export default async function FmsLoginPage() {
  if (await getFmsUser()) redirect('/fmsmoney')
  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-center mb-1">FMS Finance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Enter your PIN</p>
        <LoginForm />
      </div>
    </div>
  )
}
