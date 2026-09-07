'use server'

import { redirect } from 'next/navigation'
import {
  createSession,
  createPendingChoice,
  consumePendingChoice,
  destroySession,
  verifyPin,
} from '@/lib/deaconAuth'

type LoginState = { error: string } | { choices: string[] } | undefined

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const matches = await verifyPin(pin)

  if (matches.length === 0) {
    return { error: 'Wrong PIN' }
  }
  if (matches.length === 1) {
    await createSession(matches[0])
    redirect('/cat/deaconapp')
  }

  // Shared PIN matched more than one deacon — stash the verified
  // candidates and let the picker screen resolve which one this is.
  await createPendingChoice(matches)
  return { choices: matches }
}

export async function selectDeaconAction(name: string): Promise<{ error: string } | undefined> {
  const choices = await consumePendingChoice()
  if (!choices || !choices.includes(name)) {
    return { error: 'That took too long — enter your PIN again' }
  }
  await createSession(name)
  redirect('/cat/deaconapp')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/deaconapp/login')
}
