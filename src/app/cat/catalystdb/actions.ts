'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSession, destroySession, verifyPin } from '@/lib/catalystdbAuth'
import { createElderSession, destroyElderSession, verifyElderPin } from '@/lib/chmElderAuth'
import { serverClientIp } from '@/lib/clientIp'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const ip = await serverClientIp()
  // One 4-digit PIN per leader. Bill and Donna's opens the full app; any other leader's valid PIN is not a failed attempt here.
  const { matches, locked } = await verifyPin(pin, ip)

  if (locked) {
    return { error: 'Too many attempts. Ask Watson to "unlock login" via Telegram, then try again.' }
  }
  if (matches.length === 0) {
    // Not Bill or Donna. An elder's deacon-app PIN opens the DSS dashboard only, never the Catalyst Database.
    let fromDashboard = false
    try {
      const ref = (await headers()).get('referer')
      fromDashboard = (ref ? new URL(ref).searchParams.get('next') : null) === '/cat/dashboard'
    } catch {}
    if (fromDashboard) {
      const { elder, locked: elderLocked } = await verifyElderPin(pin, ip)
      if (elderLocked) return { error: 'Too many attempts. Ask Watson to "unlock login" via Telegram, then try again.' }
      if (elder) {
        await createElderSession(elder)
        redirect('/cat/dashboard')
      }
    }
    return { error: 'Wrong PIN' }
  }
  // Two known users with unique PINs by design -- a collision would mean
  // both were somehow assigned the same PIN, in which case picking the
  // first match is a harmless fallback, not a security gap (both are
  // already fully authorized users of this tool).
  await createSession(matches[0])
  // Other PIN-gated tools (the Bill/Donna session is shared) bounce back here via ?next=.
  let next = '/cat/catalystdb'
  try {
    const ref = (await headers()).get('referer')
    const wanted = ref ? new URL(ref).searchParams.get('next') : null
    if (wanted === '/cat/attsched' || wanted === '/cat/dashboard' || wanted === '/cat/9e9') next = wanted
  } catch {}
  redirect(next)
}

export async function logoutAction() {
  await destroySession()
  await destroyElderSession()
  redirect('/cat/catalystdb/login')
}
