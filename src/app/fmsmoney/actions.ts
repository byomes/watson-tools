'use server'

import { redirect } from 'next/navigation'
import { createFmsSession, destroyFmsSession, fmsWatson, verifyFmsPin } from '@/lib/fmsAuth'
import { serverClientIp } from '@/lib/clientIp'

type FormState = { error: string } | undefined

export async function fmsLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pin = String(formData.get('pin') ?? '').trim()
  const { user, locked, noPin } = await verifyFmsPin(pin, await serverClientIp())
  if (noPin) return { error: 'No PIN has been set up yet. Use the setup link.' }
  if (locked) return { error: 'Locked after two wrong PINs. Only Bill can unlock it, by messaging Watson "unlock fms".' }
  if (!user) return { error: 'Wrong PIN' }
  await createFmsSession(user)
  redirect('/fmsmoney')
}

export async function fmsLogoutAction() {
  await destroyFmsSession()
  redirect('/fmsmoney/login')
}

export async function fmsSetupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()
  const again = String(formData.get('again') ?? '').trim()
  if (pin !== again) return { error: 'The two PINs do not match.' }
  const res = await fmsWatson('setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, pin }) })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) return { error: String(d.error ?? 'Could not set the PIN.') }
  redirect('/fmsmoney/login')
}
