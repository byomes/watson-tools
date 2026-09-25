import type { Metadata } from 'next'
import { Fraunces, Public_Sans, IBM_Plex_Mono } from 'next/font/google'

// Fonts scoped to /sms only (not added to the shared root layout, which
// every other wtsn.me tool also renders under) -- Fraunces for the
// wordmark/headings, Public Sans for UI text, IBM Plex Mono for
// timestamps/phone numbers/tag labels, matching the approved design mockup.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-fraunces' })
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-public-sans' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono' })

export const metadata: Metadata = {
  title: 'Watson SMS',
  description: "Watson's 1:1 texting tool",
  robots: { index: false, follow: false },
  manifest: '/manifest.sms.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Watson SMS' },
}

export const viewport = {
  themeColor: '#3B6A4C',
}

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`} style={{ fontFamily: 'var(--font-public-sans), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
