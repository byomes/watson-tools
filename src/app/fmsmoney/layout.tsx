import type { Metadata, Viewport } from 'next'
import AutoTheme from './AutoTheme'

export const metadata: Metadata = {
  title: 'FMS Finance',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
}

export default function FmsMoneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AutoTheme>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">{children}</div>
    </AutoTheme>
  )
}
