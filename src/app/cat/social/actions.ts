'use server'

import { redirect } from 'next/navigation'
import { checkPin, createSession, destroySession } from '@/lib/socialAuth'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const ok = await checkPin(pin)
  if (!ok) return { error: 'Wrong PIN' }
  await createSession()
  redirect('/cat/social')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/social/login')
}
