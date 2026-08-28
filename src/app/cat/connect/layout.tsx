import { Montserrat, Open_Sans } from 'next/font/google'

// Montserrat stands in for Proxima Nova (paid/licensed, not embeddable) —
// used by the live Subsplash form for its heading and field labels
// (font-family: proxima-nova, confirmed via computed style on the live
// form). Montserrat is the standard free substitute, per both general
// font-matching guides and Mark Simonson Studio's own recommendation
// (marksimonson.com/notebook/view/fonts-similar-to-proxima-nova).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-connect-card-heading',
  display: 'swap',
})

// Open Sans — confirmed via computed style as the actual font Subsplash
// uses for input/textarea text specifically (distinct from the heading/
// label font).
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-connect-card-input',
  display: 'swap',
})

export default function ConnectCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${openSans.variable}`}>
      {children}
    </div>
  )
}
