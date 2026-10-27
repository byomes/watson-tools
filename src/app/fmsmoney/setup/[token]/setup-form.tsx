'use client'

import { useActionState } from 'react'
import { fmsSetupAction } from '../../actions'

export default function SetupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(fmsSetupAction, undefined)
  const field = 'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-center text-2xl tracking-[0.4em]'
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input name="pin" type="password" inputMode="numeric" autoComplete="new-password" autoFocus pattern="[0-9]*" maxLength={8} className={field} aria-label="New PIN" />
      <input name="again" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]*" maxLength={8} className={field} aria-label="New PIN again" />
      {state?.error && <p className="text-center text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-semibold disabled:opacity-50">
        {pending ? 'Saving…' : 'Save PIN'}
      </button>
    </form>
  )
}
