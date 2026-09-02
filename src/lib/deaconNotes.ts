// created_at is stored as sqlite's datetime('now') -- UTC, no offset -- so
// treat it as such (append Z) rather than letting the browser assume local.
export function formatDeaconNoteDate(createdAt: string): string {
  try {
    return new Date(`${createdAt.replace(' ', 'T')}Z`).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return createdAt
  }
}
