'use client'

import { useEffect, useState } from 'react'

// Web Push for Watson SMS (2026-09-25). iOS only allows this at all for a
// home-screen-installed (standalone) PWA on 16.4+, and the permission
// prompt must come from a genuine user tap -- never call requestPermission
// automatically. See public/sw-sms.js for the service worker itself.

export type PushStatus = 'unsupported' | 'not-standalone' | 'default' | 'granted' | 'denied' | 'busy' | 'error'

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function bufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function useSmsPush(): {
  status: PushStatus
  errorDetail: string
  enable: () => Promise<void>
  disable: () => Promise<void>
} {
  const [status, setStatus] = useState<PushStatus>('default')
  const [errorDetail, setErrorDetail] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported')
      return
    }
    if (!isStandalone()) {
      setStatus('not-standalone')
      return
    }
    setStatus(Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default')
  }, [])

  async function enable() {
    if (status === 'unsupported' || status === 'not-standalone' || status === 'busy') return
    setStatus('busy')
    setErrorDetail('')
    try {
      await withTimeout(runEnable(), 15000, 'turning on notifications')
    } catch (e) {
      setErrorDetail(e instanceof Error ? e.message : 'Something went wrong')
      setStatus(Notification.permission === 'denied' ? 'denied' : 'error')
    }
  }

  async function runEnable() {
    // iOS treats a tap as a one-shot "you may now ask the user something"
    // token -- any await placed before requestPermission() can silently
    // spend it, so the system prompt never appears and the call just hangs.
    // This has to be the very first thing that happens after the tap.
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'default')
      return
    }

    const registration = await navigator.serviceWorker.register('/sw-sms.js', { scope: '/sms/' })
    await navigator.serviceWorker.ready

    const keyRes = await fetch('/api/sms/push/vapid-public-key')
    if (!keyRes.ok) throw new Error('Could not reach Watson to get set up (vapid key fetch failed)')
    const { publicKey } = (await keyRes.json()) as { publicKey: string }
    if (!publicKey) throw new Error('Watson has no notification key configured yet')

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource,
    })

    const subRes = await fetch('/api/sms/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: bufferToBase64Url(subscription.getKey('p256dh')),
          auth: bufferToBase64Url(subscription.getKey('auth')),
        },
      }),
    })
    if (!subRes.ok) throw new Error('Got a subscription from iOS but Watson would not save it')

    setStatus('granted')
  }

  async function disable() {
    if (status === 'busy') return
    setStatus('busy')
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sms/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/sms/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus('default')
    } catch {
      setStatus('granted')
    }
  }

  return { status, errorDetail, enable, disable }
}
