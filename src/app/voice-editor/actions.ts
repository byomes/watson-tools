'use server'

import { redirect } from 'next/navigation'
import { checkPin, createSession, destroySession } from '@/lib/voiceEditorAuth'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  if (!checkPin(pin)) return { error: 'Wrong PIN' }
  await createSession()
  redirect('/voice-editor')
}

export async function logoutAction() {
  await destroySession()
  redirect('/voice-editor/login')
}
