import type { LeaderboardEntry } from '../types'

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const RANK_LABELS = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  if (!entries?.length) return null
  const topScore = entries[0]?.score ?? 1
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '8px' }}>CLASSIFICA</p>
      {entries.slice(0, 5).map((e, i) => {
        const isMe = e.userId === currentUserId
        const pct = Math.round((e.score / topScore) * 100)
        const col = isMe ? 'var(--lime)' : RANK_COLORS[i] ?? 'var(--text-muted)'
        return (
          <div key={e.userId} style={{ marginBottom: '8px' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                {RANK_LABELS[i] ?? <span className="font-display" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{i + 1}</span>}
              </span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--lime)' : 'var(--text)' }}>
                {e.userName}
                {isMe && <span style={{ fontSize: '9px', color: 'var(--lime)', marginLeft: '4px', letterSpacing: '0.1em' }}>TU</span>}
              </span>
              {e.verified && <span style={{ fontSize: '9px', color: 'var(--green)' }}>✓</span>}
              <span className="font-display" style={{ fontSize: '1rem', color: col, flexShrink: 0 }}>{e.score.toLocaleString()}</span>
            </div>
            <div style={{ height: '2px', background: 'var(--border)', marginLeft: '28px', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: col, opacity: isMe ? 1 : 0.6 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
