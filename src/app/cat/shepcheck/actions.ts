'use server'

import { redirect } from 'next/navigation'
import { createSession, destroySession, verifyPin } from '@/lib/shepcheckAuth'
import { serverClientIp } from '@/lib/clientIp'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const ip = await serverClientIp()
  const { matches, locked } = await verifyPin(pin, ip)

  if (locked) {
    return { error: 'Too many attempts. Ask Watson to "unlock login" via Telegram, then try again.' }
  }
  if (matches.length === 0) {
    return { error: 'Wrong PIN' }
  }
  await createSession(matches[0])
  redirect('/cat/shepcheck')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/shepcheck/login')
}
