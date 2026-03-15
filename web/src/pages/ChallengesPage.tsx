import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import LeaderboardCard from '../components/LeaderboardCard'
import Layout from '../components/Layout'
import type { Challenge } from '../types'

const LEVEL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: '#B8FF00', bg: 'rgba(184,255,0,0.08)',   border: 'rgba(184,255,0,0.2)' },
  intermediate: { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.2)' },
  advanced:     { color: '#FF4500', bg: 'rgba(255,69,0,0.08)',    border: 'rgba(255,69,0,0.2)' },
  all:          { color: '#3D9EFF', bg: 'rgba(61,158,255,0.08)',  border: 'rgba(61,158,255,0.2)' },
}

const TYPE_ICONS: Record<string, string> = { steps: '👟', calories: '🔥', distance: '📍', workouts: '💪' }
const PERIOD_LABELS: Record<string, string> = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' }

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const load = () => getActiveChallenges()
    .then(c => { setChallenges(c); setLoading(false) })
    .catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleJoin = async (challengeId: string) => {
    if (!user) return
    setJoining(challengeId)
    await joinChallenge(challengeId, user.uid)
    await load()
    setJoining(null)
  }

  const daysLeft = (endDate: number) => {
    const days = Math.ceil((endDate - Date.now()) / 86400000)
    return days <= 1 ? '1g rimasto' : `${days}g rimasti`
  }

  return (
    <Layout>
      {/* Header */}
      <div
        className="relative px-5 pt-12 pb-6 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #060B17 100%)', borderBottom: '1px solid #182035' }}
      >
        <div
          className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)' }}
        />
        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#FFB800' }}>
          Competizioni
        </p>
        <h1
          className="mt-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}
        >
          SFIDE
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8A8A96' }}>Compete · Vinci · Scala le leghe</p>
      </div>

      {/* Content */}
      <div className="px-4 pt-5">
        {loading && (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#FF4500', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div className="text-center py-16">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4"
              style={{ background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.2)' }}
            >
              🏆
            </div>
            <p className="font-bold" style={{ color: '#F8F8FC' }}>Nessuna sfida attiva</p>
            <p className="text-sm mt-1" style={{ color: '#8A8A96' }}>Torna presto per nuove sfide</p>
          </div>
        )}

        <div className="space-y-4">
          {challenges.map(c => {
            const isParticipant = user ? c.participants.includes(user.uid) : false
            const levelStyle = LEVEL_STYLES[c.fitnessLevel] ?? LEVEL_STYLES.all
            return (
              <div
                key={c.id}
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: '#0E1424', border: '1px solid #182035' }}
              >
                {/* Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 70%)' }} />

                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)' }}>
                      {TYPE_ICONS[c.type]}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: '#F8F8FC' }}>
                        {c.title || `Sfida ${c.type}`}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
                          {PERIOD_LABELS[c.period]}
                        </span>
                        <span className="text-xs" style={{ color: '#8A8A96' }}>{daysLeft(c.endDate)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full capitalize" style={{ color: levelStyle.color, background: levelStyle.bg, border: `1px solid ${levelStyle.border}` }}>
                    {c.fitnessLevel}
                  </span>
                </div>

                {/* Prize */}
                <div
                  className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
                  style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}
                >
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#FFD700' }}>{c.prize.value}</p>
                    {c.prize.brandName && <p className="text-xs" style={{ color: '#8A8A96' }}>Sponsorizzato da {c.prize.brandName}</p>}
                  </div>
                </div>

                {/* Participants count */}
                <p className="text-xs mb-3" style={{ color: '#8A8A96' }}>
                  {c.participants.length} atleti in gara
                </p>

                {isParticipant ? (
                  <LeaderboardCard entries={c.leaderboard} currentUserId={user?.uid ?? ''} />
                ) : (
                  <button
                    onClick={() => handleJoin(c.id)}
                    disabled={joining === c.id}
                    className="w-full rounded-xl py-3 font-bold text-sm uppercase tracking-wider transition-all"
                    style={{
                      background: joining === c.id ? 'rgba(255,69,0,0.3)' : 'linear-gradient(135deg, #FF4500, #FF6A00)',
                      color: '#FFFFFF',
                      boxShadow: joining === c.id ? 'none' : '0 4px 20px rgba(255,69,0,0.3)',
                    }}
                  >
                    {joining === c.id ? 'Iscrizione...' : 'Partecipa alla sfida →'}
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
