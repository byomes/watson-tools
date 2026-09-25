'use server'

import { redirect } from 'next/navigation'
import { checkPin, createSession, destroySession } from '@/lib/smsAuth'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  if (!checkPin(pin)) return { error: 'Wrong PIN' }
  await createSession()
  redirect('/sms')
}

export async function logoutAction() {
  await destroySession()
  redirect('/sms/login')
}
