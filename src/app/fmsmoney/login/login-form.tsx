'use client'

import { useActionState } from 'react'
import { fmsLoginAction } from '../actions'

export default function LoginForm() {
  const [state, action, pending] = useActionState(fmsLoginAction, undefined)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus pattern="[0-9]*" maxLength={8}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-center text-2xl tracking-[0.4em]"
        aria-label="PIN"
      />
      {state?.error && <p className="text-center text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-semibold disabled:opacity-50">
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  )
}
