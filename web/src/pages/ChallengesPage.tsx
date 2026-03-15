import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import LeaderboardCard from '../components/LeaderboardCard'
import Layout from '../components/Layout'
import type { Challenge } from '../types'

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'var(--green)', intermediate: 'var(--amber)', advanced: 'var(--orange)', all: 'var(--blue)',
}
const TYPE_ICONS: Record<string, string> = { steps: '👟', calories: '🔥', distance: '📍', workouts: '💪' }
const PERIOD_LABEL: Record<string, string> = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' }

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const load = () => getActiveChallenges()
    .then(c => { setChallenges(c); setLoading(false) })
    .catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleJoin = async (id: string) => {
    if (!user) return
    setJoining(id)
    await joinChallenge(id, user.uid)
    await load()
    setJoining(null)
  }

  const daysLeft = (endDate: number) => {
    const d = Math.ceil((endDate - Date.now()) / 86400000)
    return d <= 1 ? '1G' : `${d}G`
  }

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '40px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.2em', marginBottom: '4px' }}>
          COMPETIZIONI
        </p>
        <h1 className="font-display" style={{ fontSize: '3.5rem', color: 'var(--text)', lineHeight: 0.9 }}>
          SFIDE
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '6px' }}>Compete · Vinci · Scala le leghe</p>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--lime)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span className="font-display animate-float" style={{ fontSize: '4rem', display: 'block', color: 'var(--amber)' }}>🏆</span>
            <p style={{ fontWeight: 700, color: 'var(--text)', marginTop: '16px' }}>Nessuna sfida attiva</p>
            <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Torna presto per nuove sfide</p>
          </div>
        )}

        {challenges.map(c => {
          const isParticipant = user ? c.participants.includes(user.uid) : false
          const lvColor = LEVEL_COLOR[c.fitnessLevel] ?? 'var(--blue)'
          return (
            <div key={c.id} style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '24px' }}>{TYPE_ICONS[c.type]}</span>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                      {c.title || `Sfida ${c.type}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.12em' }}>
                        {PERIOD_LABEL[c.period]}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>·</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>{daysLeft(c.endDate)} rimasti</span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: lvColor, background: `${lvColor}15`, padding: '3px 8px', borderRadius: '3px', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  {c.fitnessLevel.toUpperCase()}
                </span>
              </div>

              {/* Prize */}
              <div className="flex items-center gap-3 mb-3"
                style={{ padding: '10px 12px', borderLeft: '3px solid var(--amber)', background: 'rgba(255,184,0,0.05)' }}>
                <span style={{ fontSize: '18px' }}>🏆</span>
                <div>
                  <p className="font-display" style={{ fontSize: '1rem', color: 'var(--amber)', letterSpacing: '0.04em' }}>{c.prize.value}</p>
                  {c.prize.brandName && <p style={{ fontSize: '10px', color: 'var(--text-sub)' }}>by {c.prize.brandName}</p>}
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '12px' }}>
                {c.participants.length} atleti in gara
              </p>

              {isParticipant ? (
                <LeaderboardCard entries={c.leaderboard} currentUserId={user?.uid ?? ''} />
              ) : (
                <button
                  onClick={() => handleJoin(c.id)}
                  disabled={joining === c.id}
                  className="font-display w-full"
                  style={{
                    background: joining === c.id ? 'rgba(196,255,0,0.2)' : 'var(--lime)',
                    color: '#000', padding: '12px', fontSize: '1.1rem', letterSpacing: '0.06em',
                    borderRadius: '4px', border: 'none', cursor: joining === c.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {joining === c.id ? '...' : 'PARTECIPA →'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  )
}
