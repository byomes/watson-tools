'use client'

import { useEffect } from 'react'

// When a page is shown inside the Catalyst Database side-menu iframe, the shell's light/dark
// choice rules: the shell posts {type:'cat-theme', dark} and this makes the framed page's
// <html> match it, re-asserting it if the page's own theme hook flips it. A page opened
// on its own (not framed) is untouched.
export default function FrameThemeSync() {
  useEffect(() => {
    if (window.self === window.top) return
    const root = document.documentElement
    let want: boolean | null = null
    const apply = () => {
      if (want !== null && root.classList.contains('dark') !== want) root.classList.toggle('dark', want)
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.type !== 'cat-theme') return
      want = Boolean(e.data.dark)
      apply()
    }
    window.addEventListener('message', onMessage)
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    window.parent.postMessage({ type: 'cat-theme-request' }, window.location.origin)
    return () => {
      window.removeEventListener('message', onMessage)
      observer.disconnect()
    }
  }, [])
  return null
}
