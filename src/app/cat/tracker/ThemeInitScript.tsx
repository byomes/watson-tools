// Applies the `.dark` class to <html> synchronously, before first paint, so the phone's status
// bar / browser chrome samples a dark page from the start instead of one white frame. Same
// mechanism and reasoning as deaconapp/ThemeInitScript.tsx (see the long note there). Mirrors
// trackerTheme.ts's "default to dark unless explicitly light" rule. Must stay a plain
// (non-'use client') component so it renders as inert server HTML.
const INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('tracker-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){}})();`

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
}
