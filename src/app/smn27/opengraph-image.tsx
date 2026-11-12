import { ImageResponse } from 'next/og'

export const alt = 'Teaching in 2027 at Catalyst Community Church, Dr. Bill Yomes'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BAR = [
  ['#2f6f5e', 9], ['#8a5a2b', 2], ['#8c3b3b', 8], ['#6b4a8a', 7],
  ['#b07a1f', 4], ['#2e5b8a', 7], ['#5d7390', 4], ['#a23e57', 4],
] as const

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: '#12263f', color: '#f4efe4', padding: '64px 80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 7, textTransform: 'uppercase', opacity: 0.7 }}>
            Sunday Mornings at Catalyst
          </div>
          <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>
            Teaching in 2027
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontStyle: 'italic', marginTop: 28, color: '#e3c88f' }}>
            Holy Amidst Hostility
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', gap: 4 }}>
            {BAR.map(([c, w], i) => (
              <div key={i} style={{ display: 'flex', flexGrow: w, flexBasis: 0, background: c, borderRadius: 8 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 30, fontSize: 30 }}>
            <div style={{ display: 'flex', fontWeight: 700 }}>Dr. Bill Yomes</div>
            <div style={{ display: 'flex', opacity: 0.75 }}>Catalyst Community Church</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
