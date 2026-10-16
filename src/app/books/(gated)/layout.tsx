import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/booksAuth'

export default async function BooksGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/books/login')
  return <>{children}</>
}
