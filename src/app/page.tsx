export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="text-center">
        {/* Transparent-glyph mark, not the solid-background favicon version --
            this sits on the page's own (always-light, see globals.css) white
            background, so the navy variant reads directly with no background
            box of its own. eslint-disable: no next/image use anywhere else
            in this codebase yet, matching ConnectCardForm.tsx's convention. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/watson-icon-navy.png" alt="" className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Watson Public Tools</h1>
        <p className="mt-2 text-gray-500">wtsn.me</p>
      </div>
    </div>
  );
}
