// Shared input-validation helpers for watson-tools forms/routes. Baseline
// patterns lifted from wcky's connect-card
// (src/app/api/connect-card/route.ts) rather than reinvented per tool —
// see notes/wtsn-me-public-tools-spec.md.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredString(value: unknown, maxLength = 3000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

export function optionalString(value: unknown, maxLength = 3000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
