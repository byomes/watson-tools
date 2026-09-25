'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { loginAction } from '../actions'

const PIN_LENGTH = 6 // Watson SMS carries real pastoral content, not throwaway
// review copies -- 6 digits rather than scratch's shared 4, matching
// catalystdb's PIN length precedent for sensitive data.

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
            className={`h-4 w-4 rounded-full border-2 ${
              i < pin.length ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>}
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
              className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-xl font-medium active:scale-95 transition disabled:opacity-50 flex items-center justify-center"
            >
              {key === 'back' ? '⌫' : key}
            </button>
          ),
        )}
      </div>
    </form>
  )
}
