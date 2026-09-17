'use server'

import { redirect } from 'next/navigation'
import { checkPin, createSession, destroySession } from '@/lib/socialAuth'
import { serverClientIp } from '@/lib/clientIp'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const ip = await serverClientIp()
  const { ok, locked } = await checkPin(pin, ip)
  if (locked) return { error: 'Too many attempts. Ask a leader to unlock it via Telegram, then try again.' }
  if (!ok) return { error: 'Wrong PIN' }
  await createSession()
  redirect('/cat/social')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/social/login')
}
