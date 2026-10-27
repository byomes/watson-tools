import { fmsWatson } from '@/lib/fmsAuth'
import SetupForm from './setup-form'

export const dynamic = 'force-dynamic'

// One-time link made on the Beelink (python -m jobs.fms_books.setpin --invite Bill). Expires, and works once.
export default async function FmsSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = await fmsWatson('setup-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
  const d = res.ok ? await res.json().catch(() => null) : null
  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-center mb-1">FMS Finance</h1>
        {d?.name ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Choose a PIN, {d.name}. Four to eight digits.</p>
            <SetupForm token={token} />
          </>
        ) : (
          <p className="text-sm text-center text-slate-600 dark:text-slate-300">This setup link has expired or was already used.</p>
        )}
      </div>
    </div>
  )
}
