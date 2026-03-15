import type { LeaderboardEntry } from '../types'

const MEDALS = ['#FFB800', '#EFEFEF', '#CD7F32']

export default function LeaderboardCard({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  if (!entries?.length) return null
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Classifica
      </p>
      {entries.slice(0, 5).map((e, i) => {
        const isMe = e.userId === currentUserId
        return (
          <div
            key={e.userId}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <span
              className="font-display"
              style={{ fontSize: '1rem', color: MEDALS[i] ?? 'var(--text-sub)', width: '20px', textAlign: 'center' }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--lime)' : 'var(--text)' }}>
              {e.userName} {isMe && '← TU'}
            </span>
            {e.verified && (
              <span style={{ fontSize: '10px', color: 'var(--green)', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '3px' }}>
                ✓
              </span>
            )}
            <span className="font-display" style={{ fontSize: '1.2rem', color: isMe ? 'var(--lime)' : 'var(--text)' }}>
              {e.score.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
