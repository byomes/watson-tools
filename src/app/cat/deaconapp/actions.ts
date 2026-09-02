'use server'

import { redirect } from 'next/navigation'
import { createSession, verifyPin } from '@/lib/deaconAuth'

export async function loginAction(
  _prevState: { error: string } | undefined,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const pin = String(formData.get('pin') ?? '')
  if (!verifyPin(pin)) {
    return { error: 'Wrong PIN' }
  }
  await createSession()
  redirect('/cat/deaconapp')
}
