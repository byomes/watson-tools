'use server'

import { redirect } from 'next/navigation'
import { createSession, destroySession, verifyPin } from '@/lib/catalystdbAuth'
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
  // Two known users with unique PINs by design -- a collision would mean
  // both were somehow assigned the same PIN, in which case picking the
  // first match is a harmless fallback, not a security gap (both are
  // already fully authorized users of this tool).
  await createSession(matches[0])
  redirect('/cat/catalystdb')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/catalystdb/login')
}
