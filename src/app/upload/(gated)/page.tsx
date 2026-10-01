import type { Metadata } from 'next'
import { logoutAction } from '../actions'
import UploadForm from './UploadForm'

export const metadata: Metadata = {
  title: 'Upload',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-black dark:text-white">Upload</h1>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 underline">
              Log out
            </button>
          </form>
        </div>
        <UploadForm />
      </div>
    </div>
  )
}
