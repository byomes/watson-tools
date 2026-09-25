// Applies the `.dark` class to <html> synchronously, before the browser's
// first paint -- unlike deaconTheme.ts's useEffect, which necessarily runs
// AFTER that first paint (React effects fire post-commit). That one-frame
// gap was the actual root cause of the iOS status bar always showing light:
// the phone's status bar / chrome tints itself from the real rendered page
// background at first paint, and on a standalone Home Screen launch it
// samples once and never re-checks -- so it always locked onto that
// pre-.dark, still-white first frame regardless of the resolved theme.
// Confirmed 2026-09-25 by placing a server-rendered (no-JS-delay) red div
// at the page's top: it showed through the status bar every time, proving
// the mechanism is live background sampling at first paint, not the
// apple-mobile-web-app-status-bar-style meta tag.
//
// Mirrors readStoredTheme()'s "default to dark unless explicitly light"
// rule from deaconTheme.ts. Must stay a plain (non-'use client') component
// so it renders as inert server HTML -- a 'use client' component would
// itself only run after hydration, defeating the purpose.
const INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('deaconapp-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){}})();`

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
}
