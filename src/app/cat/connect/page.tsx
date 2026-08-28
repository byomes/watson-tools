import type { Metadata } from 'next'
import ConnectCardForm from './ConnectCardForm'

export const metadata: Metadata = {
  title: 'Connect Card',
  robots: { index: false, follow: false },
}

export default function ConnectCardPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-8">
      <div className="max-w-2xl mx-auto">
        <ConnectCardForm />
      </div>
    </div>
  )
}
