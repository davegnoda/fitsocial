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

const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 'demo-1', title: '10K Steps al Giorno', type: 'steps', period: 'weekly',
    target: 70000, endDate: Date.now() + 4 * 86400000, participants: ['a', 'b', 'c', 'd', 'e'],
    fitnessLevel: 'beginner',
    prize: { value: '€50 Nike Gift Card', brandName: 'Nike' },
    leaderboard: [
      { uid: 'a', name: 'Marco R.', value: 68400, rank: 1 },
      { uid: 'b', name: 'Giulia M.', value: 61200, rank: 2 },
      { uid: 'c', name: 'Luca T.', value: 54800, rank: 3 },
    ],
  },
  {
    id: 'demo-2', title: 'Ultra Distance Week', type: 'distance', period: 'weekly',
    target: 50, endDate: Date.now() + 2 * 86400000, participants: ['a', 'b', 'c'],
    fitnessLevel: 'advanced',
    prize: { value: '€120 Garmin Store', brandName: 'Garmin' },
    leaderboard: [
      { uid: 'a', name: 'Sara B.', value: 42.1, rank: 1 },
      { uid: 'b', name: 'Andrea F.', value: 38.6, rank: 2 },
    ],
  },
  {
    id: 'demo-3', title: 'Calorie Burner', type: 'calories', period: 'daily',
    target: 500, endDate: Date.now() + 86400000, participants: ['a', 'b', 'c', 'd'],
    fitnessLevel: 'intermediate',
    prize: { value: '€30 MyProtein', brandName: 'MyProtein' },
    leaderboard: [
      { uid: 'a', name: 'Paolo V.', value: 487, rank: 1 },
      { uid: 'b', name: 'Elena C.', value: 412, rank: 2 },
      { uid: 'c', name: 'Davide R.', value: 380, rank: 3 },
    ],
  },
]

const GLOBAL_LB = [
  { uid: '1', name: 'MarcoFit', value: 142300, rank: 1 },
  { uid: '2', name: 'GiuliaRun', value: 138900, rank: 2 },
  { uid: '3', name: 'LucaPower', value: 121400, rank: 3 },
  { uid: '4', name: 'SaraBike', value: 109800, rank: 4 },
  { uid: '5', name: 'AndreaHIIT', value: 98200, rank: 5 },
]

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [tab, setTab] = useState<'sfide' | 'global'>('sfide')

  const load = () => getActiveChallenges()
    .then(c => { setChallenges(c.length > 0 ? c : DEMO_CHALLENGES); setLoading(false) })
    .catch(() => { setChallenges(DEMO_CHALLENGES); setLoading(false) })

  useEffect(() => { load() }, [])

  const handleJoin = async (id: string) => {
    if (!user) return
    setJoining(id)
    if (!id.startsWith('demo-')) {
      await joinChallenge(id, user.uid)
      await load()
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setJoining(null)
  }

  const daysLeft = (endDate: number) => {
    const d = Math.ceil((endDate - Date.now()) / 86400000)
    return d <= 1 ? '1G' : `${d}G`
  }

  const TABS = [{ key: 'sfide', label: 'SFIDE' }, { key: 'global', label: 'GLOBALE' }]

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '40px 20px 0', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.2em', marginBottom: '4px' }}>
          COMPETIZIONI
        </p>
        <h1 className="font-display" style={{ fontSize: '3.5rem', color: 'var(--text)', lineHeight: 0.9 }}>
          SFIDE
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '6px', marginBottom: '20px' }}>Compete · Vinci · Scala le leghe</p>
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="font-display"
              style={{ padding: '10px 18px', fontSize: '1rem', letterSpacing: '0.08em',
                color: tab === t.key ? 'var(--amber)' : 'var(--text-sub)',
                borderBottom: tab === t.key ? '2px solid var(--amber)' : '2px solid transparent',
                background: 'transparent', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--amber)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* GLOBAL LEADERBOARD TAB */}
        {!loading && tab === 'global' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '12px' }}>
              TOP ATLETI · QUESTO MESE
            </p>
            {GLOBAL_LB.map((e, i) => (
              <div key={e.uid} className="flex items-center gap-3"
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="font-display" style={{ fontSize: '1.4rem', width: 28, textAlign: 'center',
                  color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{e.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{e.value.toLocaleString()} passi</p>
                </div>
                <div style={{ height: '3px', width: '60px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(e.value / GLOBAL_LB[0].value * 100)}%`, background: i === 0 ? '#FFD700' : 'var(--amber)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'sfide' && challenges.map(c => {
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
