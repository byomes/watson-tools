import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Watson Books',
  description: 'Scan books into Zotero',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Books' },
}

export const viewport = { viewportFit: 'cover' }

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
