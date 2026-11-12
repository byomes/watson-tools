export function MessageStatus({ direction, status, colors }: {
  direction: 'in' | 'out'; status: 'sent' | 'delivered' | 'failed' | null
  colors: { clay: string; inkSoft: string }
}) {
  if (direction !== 'out' || !status) return null
  const label = status === 'failed' ? 'Failed' : status === 'delivered' ? 'Delivered' : 'Sent'
  return <span className="text-xs px-1" style={{ color: status === 'failed' ? colors.clay : colors.inkSoft }}>{label}</span>
}
