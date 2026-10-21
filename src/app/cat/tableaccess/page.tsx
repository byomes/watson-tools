import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/smsAuth'
import { AutoThemeShell } from '../shepherdingreport/AutoThemeShell'
import TableAccessBoard from './TableAccessBoard'

// Bill-only: gated by the Watson SMS app's PIN session (lib/smsAuth.ts), not a public wtsn.me tool, so it skips requireLiveTool.
export const metadata: Metadata = {
  title: 'Table Access',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
}

export const dynamic = 'force-dynamic'

export default async function TableAccessPage() {
  if (!(await isLoggedIn())) redirect('/sms/login')
  return (
    <AutoThemeShell>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white">
        <TableAccessBoard />
      </div>
    </AutoThemeShell>
  )
}
