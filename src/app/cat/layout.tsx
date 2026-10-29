import CatBrandBar from './CatBrandBar'

// Every Catalyst page gets the 9e9 bar on top, except the ones that carry their own (the dashboard, the 9e9 app)
// and the public connect card. The bar hides itself when the page is shown inside the dashboard.
export default function CatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CatBrandBar />
      {children}
    </>
  )
}
