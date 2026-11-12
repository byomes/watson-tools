import type { Metadata } from 'next'
import localFont from 'next/font/local'

// Fonts scoped to /sms only (not added to the shared root layout, which
// every other wtsn.me tool also renders under) -- Fraunces for the
// wordmark/headings, Public Sans for UI text, IBM Plex Mono for
// timestamps/phone numbers/tag labels, matching the approved design mockup.
// Self-hosted (latin subset, ./fonts) so a build never depends on reaching
// Google Fonts; a Google fetch failure broke a production deploy on 2026-11-11.
const fraunces = localFont({
  src: [
    { path: './fonts/fraunces-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/fraunces-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
})
const publicSans = localFont({
  src: [
    { path: './fonts/public-sans-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/public-sans-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/public-sans-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/public-sans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-public-sans',
  display: 'swap',
})
const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
})

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
  viewportFit: 'cover',
}

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`} style={{ fontFamily: 'var(--font-public-sans), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
