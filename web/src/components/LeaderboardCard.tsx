import type { LeaderboardEntry } from '../types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId: string
}

const MEDAL_COLORS = [
  { color: '#FFD700', bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.2)', icon: '🥇' },
  { color: '#C0C0C0', bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.15)', icon: '🥈' },
  { color: '#CD7F32', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.15)', icon: '🥉' },
]

export default function LeaderboardCard({ entries, currentUserId }: Props) {
  const sorted = [...entries].sort((a, b) => b.score - a.score)
  if (sorted.length === 0) {
    return (
      <div className="py-4 text-center text-sm" style={{ color: '#8A8A96' }}>
        Nessun partecipante ancora
      </div>
    )
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #182035' }}>
      {sorted.map((entry, i) => {
        const isMe = entry.userId === currentUserId
        const medal = MEDAL_COLORS[i]
        return (
          <div
            key={entry.userId}
            className="flex items-center px-3 py-3 gap-3 transition-colors"
            style={{
              background: isMe ? 'rgba(255,69,0,0.06)' : i % 2 === 0 ? '#0E1424' : '#111116',
              borderLeft: isMe ? '2px solid #FF4500' : '2px solid transparent',
            }}
          >
            {/* Rank */}
            <div className="w-7 text-center">
              {medal ? (
                <span className="text-base">{medal.icon}</span>
              ) : (
                <span className="text-sm font-bold" style={{ color: '#283650' }}>#{i + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: medal ? medal.bg : isMe ? 'rgba(255,69,0,0.12)' : 'rgba(138,138,150,0.08)',
                border: `1px solid ${medal ? medal.border : isMe ? 'rgba(255,69,0,0.25)' : '#182035'}`,
                color: medal ? medal.color : isMe ? '#FF4500' : '#8A8A96',
              }}
            >
              {entry.userName?.[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: isMe ? '#F8F8FC' : '#D0D0D8' }}
              >
                {entry.userName} {isMe && <span style={{ color: '#FF4500', fontSize: '10px' }}>YOU</span>}
              </p>
            </div>

            {/* Score */}
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '1.1rem',
                color: medal ? medal.color : isMe ? '#FF4500' : '#8A8A96',
              }}
            >
              {entry.score.toLocaleString()}
            </p>
          </div>
        )
      })}
    </div>
  )
}
