import type { Metadata, Viewport } from 'next'
import { isLoggedIn } from '@/lib/nailsAuth'
import NailsApp from './NailsApp'

export const metadata: Metadata = {
  title: 'Nails With Allie',
  robots: { index: false, follow: false },
  manifest: '/nails/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/nails/icon.svg', type: 'image/svg+xml' },
      { url: '/nails/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/nails/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Nails', statusBarStyle: 'default' },
}

export const viewport: Viewport = { themeColor: '#D98A9C' }

export const dynamic = 'force-dynamic'

export default async function NailsPage() {
  return <NailsApp unlocked={await isLoggedIn()} />
}
