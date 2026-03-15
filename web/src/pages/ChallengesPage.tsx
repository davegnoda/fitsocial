import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import LeaderboardCard from '../components/LeaderboardCard'
import Layout from '../components/Layout'
import type { Challenge } from '../types'

const levelColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
  all: 'bg-blue-100 text-blue-700',
}

const typeIcons: Record<string, string> = {
  steps: '👟', calories: '🔥', distance: '📍', workouts: '💪'
}

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => getActiveChallenges()
    .then(c => { setChallenges(c); setLoading(false) })
    .catch(err => { console.error('Failed to load data:', err); setLoading(false) })

  useEffect(() => { load() }, [])

  const handleJoin = async (challengeId: string) => {
    if (!user) return
    await joinChallenge(challengeId, user.uid)
    load()
  }

  const daysLeft = (endDate: number) => {
    const days = Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24))
    return days === 1 ? '1 giorno rimasto' : `${days} giorni rimasti`
  }

  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5">
        <h1 className="text-2xl font-bold">Sfide 🏆</h1>
        <p className="text-sm text-gray-400 mt-1">Compete, vinci, scala le leghe</p>
      </div>

      <div className="px-5 py-5">
        {loading && <p className="text-center text-gray-400 py-10">Caricamento...</p>}
        {!loading && challenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-500">Nessuna sfida attiva al momento</p>
          </div>
        )}
        <div className="space-y-4">
          {challenges.map(c => {
            const isParticipant = user ? c.participants.includes(user.uid) : false
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeIcons[c.type]}</span>
                    <div>
                      <h3 className="font-bold">{c.title || `Sfida ${c.type} ${c.period}`}</h3>
                      <p className="text-xs text-gray-400">{daysLeft(c.endDate)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${levelColors[c.fitnessLevel]}`}>
                    {c.fitnessLevel}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl px-4 py-2 mb-3 flex items-center gap-2">
                  <span>🎁</span>
                  <span className="text-sm font-semibold">{c.prize.value}</span>
                  {c.prize.brandName && <span className="text-xs text-gray-400">· {c.prize.brandName}</span>}
                </div>

                <p className="text-xs text-gray-400 mb-3">{c.participants.length} partecipanti</p>

                {isParticipant ? (
                  <LeaderboardCard entries={c.leaderboard} currentUserId={user?.uid ?? ''} />
                ) : (
                  <button onClick={() => handleJoin(c.id)}
                    className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold hover:bg-blue-700 transition-colors">
                    Partecipa alla sfida
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
