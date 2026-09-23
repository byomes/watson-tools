'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { loginAction } from '../actions'

const PIN_LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export default function PinPad() {
  const [pin, setPin] = useState('')
  const [state, formAction, pending] = useActionState(loginAction, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  const error = state?.error

  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state?.error) setPin('')
  }

  useEffect(() => {
    if (pin.length === PIN_LENGTH && !pending) {
      formRef.current?.requestSubmit()
    }
  }, [pin, pending])

  function press(key: string) {
    if (pending) return
    if (key === 'back') {
      setPin((p) => p.slice(0, -1))
    } else if (key && pin.length < PIN_LENGTH) {
      setPin((p) => p + key)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="pin" value={pin} />
      <div className="flex justify-center gap-2.5 mb-6">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={pending}
              className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-medium active:scale-95 transition disabled:opacity-50 flex items-center justify-center"
            >
              {key === 'back' ? '⌫' : key}
            </button>
          ),
        )}
      </div>
    </form>
  )
}
