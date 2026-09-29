import { Montserrat, Open_Sans } from 'next/font/google'

// Same font substitution as src/app/cat/connect/layout.tsx (Montserrat for
// heading/labels, Open Sans for input text) -- this page is visually the
// same "Catalyst form" family, just a shorter card, so it keeps the same
// typography rather than inventing a second look.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-connect-card-heading',
  display: 'swap',
})

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-connect-card-input',
  display: 'swap',
})

export default function BdayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${openSans.variable}`}>
      {children}
    </div>
  )
}
