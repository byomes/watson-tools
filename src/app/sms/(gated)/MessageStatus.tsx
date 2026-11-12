export function MessageStatus({ direction, status, colors }: {
  direction: 'in' | 'out'; status: 'sending' | 'stalled' | 'sent' | 'delivered' | 'failed' | null
  colors: { clay: string; inkSoft: string }
}) {
  if (direction !== 'out' || !status) return null
  // "Sent" only appears once the gateway phone confirms it sent the text (jobs/sms/status_sync.py in the watson repo).
  const label = status === 'failed' ? 'Failed'
    : status === 'stalled' ? 'Not sent yet'
    : status === 'sending' ? 'Sending...'
    : status === 'delivered' ? 'Delivered' : 'Sent'
  const warn = status === 'failed' || status === 'stalled'
  return <span className="text-xs px-1" style={{ color: warn ? colors.clay : colors.inkSoft }}>{label}</span>
}
