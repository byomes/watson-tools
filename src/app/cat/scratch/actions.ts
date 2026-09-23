'use server'

import { redirect } from 'next/navigation'
import { checkPin, createSession, destroySession } from '@/lib/scratchAuth'

type LoginState = { error: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  if (!checkPin(pin)) return { error: 'Wrong PIN' }
  await createSession()
  redirect('/cat/scratch')
}

export async function logoutAction() {
  await destroySession()
  redirect('/cat/scratch/login')
}
