import type { LeaderboardEntry } from '../types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId: string
}

const medals = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ entries, currentUserId }: Props) {
  const sorted = [...entries].sort((a, b) => b.score - a.score)

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Nessun partecipante ancora</p>
  }

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {sorted.map((entry, i) => (
        <div key={entry.userId}
          className={`flex items-center px-4 py-3 border-b border-gray-50 last:border-0 ${
            entry.userId === currentUserId ? 'bg-blue-50' : 'bg-white'
          }`}>
          <span className="w-8 text-lg">{medals[i] ?? `${i + 1}`}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">{entry.userName}</p>
            {entry.verified && <p className="text-xs text-green-500">✓ verificato</p>}
          </div>
          <p className="font-bold text-blue-600">{entry.score.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
