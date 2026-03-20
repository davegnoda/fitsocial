import type { LeaderboardEntry } from '../types'

const RANK_LABELS = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  if (!entries?.length) return null
  const topScore = entries[0]?.score ?? 1
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Classifica</p>
      {entries.slice(0, 5).map((e, i) => {
        const isMe = e.userId === currentUserId
        const pct = Math.round((e.score / topScore) * 100)
        const barColor = isMe ? 'var(--indigo)' : i === 0 ? '#F59E0B' : 'var(--border-strong)'
        return (
          <div key={e.userId} style={{ marginBottom: '10px' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: '14px', width: '22px', textAlign: 'center', flexShrink: 0 }}>
                {RANK_LABELS[i] ?? <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)' }}>{i + 1}</span>}
              </span>
              <span style={{
                flex: 1, fontSize: '12px',
                fontWeight: isMe ? 700 : 500,
                color: isMe ? 'var(--indigo)' : 'var(--text)',
              }}>
                {e.userName}
                {isMe && (
                  <span style={{ fontSize: '9px', color: 'white', background: 'var(--indigo)', marginLeft: '6px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>TU</span>
                )}
              </span>
              {e.verified && (
                <span style={{ fontSize: '9px', color: 'var(--green)', background: 'var(--green-bg)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>✓</span>
              )}
              <span className="font-display" style={{ fontSize: '0.95rem', color: isMe ? 'var(--indigo)' : 'var(--text)', fontWeight: 700, flexShrink: 0 }}>
                {e.score.toLocaleString()}
              </span>
            </div>
            <div style={{ height: '3px', background: 'var(--bg-surface)', marginLeft: '26px', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '2px', opacity: isMe ? 1 : 0.7 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
