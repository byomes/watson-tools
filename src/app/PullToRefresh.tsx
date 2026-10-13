'use client'

import { useEffect, useRef, useState } from 'react'

// Pull down from the top of a page to hard-refresh it (touch devices). Active on the internal
// /cat tools and on anything framed inside the Catalyst Database menu; never on the public
// visitor forms, where an accidental pull would throw away typing. The same pages also get
// tap-the-page-heading (<h1>) to hard-refresh, unless the heading holds its own link or button. A framed page refreshes
// only itself, so the menu and your place in it stay put.
const PUBLIC_FORMS = ['/cat/connect', '/cat/bday']
const THRESHOLD = 80

function scrollerOf(el: Element | null): Element {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n
  }
  return document.scrollingElement ?? document.documentElement
}

export default function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const start = useRef<{ y: number; x: number; el: Element } | null>(null)
  const armed = useRef(false)

  useEffect(() => {
    const framed = window.self !== window.top
    const path = window.location.pathname
    if (!framed && (!path.startsWith('/cat/') || PUBLIC_FORMS.some((p) => path.startsWith(p)))) return

    document.documentElement.classList.add('cat-refresh-h1')
    document.documentElement.style.overscrollBehaviorY = 'contain' // hand the gesture to us, not the browser's soft refresh

    const onStart = (e: TouchEvent) => {
      const t = e.target as Element | null
      if (!t || e.touches.length !== 1 || t.closest('input, textarea, select, [contenteditable="true"]')) {
        start.current = null
        return
      }
      const scroller = scrollerOf(t)
      start.current = scroller.scrollTop <= 0 ? { y: e.touches[0].clientY, x: e.touches[0].clientX, el: scroller } : null
      armed.current = false
    }
    const onMove = (e: TouchEvent) => {
      const s = start.current
      if (!s) return
      const dy = e.touches[0].clientY - s.y
      const dx = Math.abs(e.touches[0].clientX - s.x)
      if (dy <= 0 || dx > dy || s.el.scrollTop > 0) {
        setPull(0)
        armed.current = false
        return
      }
      armed.current = dy >= THRESHOLD
      setPull(Math.min(dy, THRESHOLD * 1.4))
    }
    const onEnd = () => {
      const go = armed.current
      start.current = null
      armed.current = false
      setPull(0)
      if (go) window.location.reload()
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null
      const h = t?.closest('h1')
      if (!h || t?.closest('a, button, input, select, textarea')) return
      window.location.reload()
    }
    document.addEventListener('click', onClick)

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.documentElement.classList.remove('cat-refresh-h1')
      document.removeEventListener('click', onClick)
      document.documentElement.style.overscrollBehaviorY = ''
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (pull <= 0) return null
  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[100] flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.min(pull, THRESHOLD) - 36}px)` }}
    >
      <div className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium px-4 py-2 shadow">
        {pull >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
      </div>
    </div>
  )
}
