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
  icons: {
    icon: [
      { url: '/sms-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/sms-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // iOS's "Add to Home Screen" reads this link tag directly rather than
    // reliably reading the web manifest's icons array -- this is the one
    // that actually decides what shows up on Bill's home screen.
    apple: [{ url: '/sms-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport = {
  themeColor: '#3C5C89',
}

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`} style={{ fontFamily: 'var(--font-public-sans), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
