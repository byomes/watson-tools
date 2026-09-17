'use server'

import { redirect } from 'next/navigation'
import {
  createSession,
  createPendingChoice,
  consumePendingChoice,
  destroySession,
  verifyPin,
} from '@/lib/deaconAuth'
import { serverClientIp } from '@/lib/clientIp'

type LoginState = { error: string } | { choices: string[] } | undefined

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const ip = await serverClientIp()
  const { matches, locked, sessionTokens } = await verifyPin(pin, ip)

  if (locked) {
    return { error: 'Too many attempts. Ask a leader to unlock it via Telegram, then try again.' }
  }
  if (matches.length === 0) {
    return { error: 'Wrong PIN' }
  }
  if (matches.length === 1) {
    await createSession(matches[0], sessionTokens[matches[0]])
    redirect('/cat/deaconapp')
  }

  // A PIN matched more than one deacon — stash the verified candidates
  // (and their already-minted tokens) and let the picker screen resolve
  // which one this is.
  await createPendingChoice(matches, sessionTokens)
  return { choices: matches }
}

export async function selectDeaconAction(name: string): Promise<{ error: string } | undefined> {
  const choice = await consumePendingChoice()
  if (!choice || !choice.names.includes(name)) {
    return { error: 'That took too long — enter your PIN again' }
  }
  await createSession(name, choice.sessionTokens[name])
  redirect('/cat/deaconapp')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/deaconapp/login')
}
