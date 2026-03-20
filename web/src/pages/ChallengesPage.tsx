import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import { getTopUsers, getTopUsersByRecentActivity } from '../services/userService'
import LeaderboardCard from '../components/LeaderboardCard'
import CreateChallengeModal from '../components/CreateChallengeModal'
import Layout from '../components/Layout'
import type { Challenge, UserProfile } from '../types'

const TYPE_ICONS: Record<string, string> = { steps: '👟', calories: '🔥', distance: '📍', workouts: '💪' }
const TYPE_COLORS: Record<string, string> = { steps: '#F97316', distance: '#3B82F6', calories: '#EF4444', workouts: '#7C3AED' }

const PERIOD_LABEL: Record<string, string> = { daily: 'Oggi', weekly: 'Questa settimana', monthly: 'Questo mese' }

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#EA580C', '#DB2777', '#6D28D9', '#059669']

const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 'demo-1', title: '10.000 Passi al Giorno',
    type: 'steps', period: 'daily', fitnessLevel: 'all', target: 10000,
    participants: Array.from({ length: 1247 }, (_, i) => `u${i}`),
    prize: { type: 'sponsored', value: '€50 Gift Card', brandName: 'Nike', amount: 50 },
    leaderboard: [], startDate: Date.now() - 86400000 * 2, endDate: Date.now() + 86400000 * 5,
  },
  {
    id: 'demo-2', title: 'Corri 30km in una Settimana',
    type: 'distance', period: 'weekly', fitnessLevel: 'intermediate', target: 30,
    participants: Array.from({ length: 342 }, (_, i) => `u${i}`),
    prize: { type: 'sponsored', value: '€100 Store Credit', brandName: 'Adidas', amount: 100 },
    leaderboard: [], startDate: Date.now() - 86400000 * 3, endDate: Date.now() + 86400000 * 4,
  },
  {
    id: 'demo-3', title: '5 Allenamenti questa Settimana',
    type: 'workouts', period: 'weekly', fitnessLevel: 'beginner', target: 5,
    participants: Array.from({ length: 89 }, (_, i) => `u${i}`),
    prize: { type: 'pool', value: 'Kit MyProtein Gratis', amount: 0 },
    leaderboard: [], startDate: Date.now() - 86400000, endDate: Date.now() + 86400000 * 6,
  },
  {
    id: 'demo-4', title: 'Brucia 500 Kcal al Giorno',
    type: 'calories', period: 'daily', fitnessLevel: 'advanced', target: 500,
    participants: Array.from({ length: 28 }, (_, i) => `u${i}`),
    prize: { type: 'sponsored', value: '€200 Abbonamento Gym', brandName: 'Virgin Active', amount: 200 },
    leaderboard: [], startDate: Date.now() - 86400000 * 4, endDate: Date.now() + 86400000 * 3,
  },
]

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [tab, setTab] = useState<'sfide' | 'global'>('sfide')
  const [topUsers, setTopUsers] = useState<UserProfile[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [globalPeriod, setGlobalPeriod] = useState<'always' | 'week' | 'month'>('always')
  const [rankedUsers, setRankedUsers] = useState<(UserProfile & { recentSteps?: number })[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = () => {
    const timeout = new Promise<Challenge[]>((resolve) => setTimeout(() => resolve([]), 2500))
    Promise.race([getActiveChallenges(), timeout])
      .then(c => { setChallenges(c as Challenge[]); setLoading(false) })
      .catch(() => { setChallenges([]); setLoading(false) })
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    getTopUsers(10).then(u => { setTopUsers(u); if (globalPeriod === 'always') setRankedUsers(u) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (globalPeriod === 'always') {
      setRankedUsers(topUsers)
    } else {
      const days = globalPeriod === 'week' ? 7 : 30
      getTopUsersByRecentActivity(days).then(u => setRankedUsers(u)).catch(() => {})
    }
  }, [globalPeriod, topUsers])

  const handleJoin = async (id: string) => {
    if (!user) return
    setJoining(id)
    await joinChallenge(id, user.uid)
    load()
    setJoining(null)
  }

  const daysLeft = (endDate: number) => {
    const d = Math.ceil((endDate - Date.now()) / 86400000)
    return d <= 1 ? '1 giorno' : `${d} giorni`
  }

  const TABS = [{ key: 'sfide', label: 'Sfide' }, { key: 'global', label: 'Globale' }]

  return (
    <Layout>
      {/* HEADER */}
      <div className="animate-fade" style={{ padding: '52px 20px 0' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Competizioni
        </p>
        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: '2rem',
          fontWeight: 800,
          color: 'var(--text)',
          lineHeight: 1.1,
          marginBottom: '6px',
          letterSpacing: '-0.01em',
        }}>
          Sfide &amp; Premi
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '20px', lineHeight: 1.4, letterSpacing: '0.01em' }}>
          Completa gli obiettivi validati dai tuoi dispositivi e vinci.
        </p>

        {/* Tab pills */}
        <div className="flex gap-2" style={{ marginBottom: '4px' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{
                padding: '8px 20px', fontSize: '0.9rem', letterSpacing: '0.04em',
                borderRadius: '30px', cursor: 'pointer',
                background: tab === t.key ? 'var(--gradient)' : 'var(--bg-card)',
                color: tab === t.key ? 'white' : 'var(--text-sub)',
                fontFamily: "'Sora', sans-serif",
                fontWeight: 600,
                boxShadow: tab === t.key ? '0 4px 12px rgba(79,70,229,0.3)' : 'var(--shadow-card)',
                border: tab === t.key ? 'none' : '1px solid var(--border)',
                transition: 'all 0.2s',
              } as React.CSSProperties}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowCreate(true)}
          style={{
            background: 'var(--gradient)',
            color: 'white',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Sora', sans-serif",
            boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
            width: '100%',
            marginTop: '12px',
          }}>
          + Crea Sfida
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* GLOBAL LEADERBOARD TAB */}
        {!loading && tab === 'global' && (
          <div>
            {/* Period filter pills */}
            <div className="flex gap-2" style={{ marginBottom: '14px' }}>
              {([
                { key: 'always' as const, label: 'Sempre' },
                { key: 'week' as const, label: 'Settimana' },
                { key: 'month' as const, label: 'Mese' },
              ]).map(p => (
                <button key={p.key} onClick={() => setGlobalPeriod(p.key)}
                  style={{
                    padding: '6px 14px', fontSize: '12px', letterSpacing: '0.03em',
                    borderRadius: '20px', cursor: 'pointer',
                    background: globalPeriod === p.key ? 'var(--indigo)' : 'var(--bg-surface)',
                    color: globalPeriod === p.key ? 'white' : 'var(--text-sub)',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    border: globalPeriod === p.key ? 'none' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {globalPeriod === 'always' ? 'Top atleti · XP totale' : globalPeriod === 'week' ? 'Top atleti · Ultimi 7 giorni' : 'Top atleti · Ultimi 30 giorni'}
            </p>
            {rankedUsers.map((u, i) => {
              const initials = (u.name ?? '').slice(0, 2).toUpperCase()
              const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const isXp = globalPeriod === 'always'
              const value = isXp ? (u.xp ?? 0) : (u.recentSteps ?? 0)
              const maxVal = isXp ? (rankedUsers[0]?.xp || 1) : ((rankedUsers[0] as UserProfile & { recentSteps?: number })?.recentSteps || 1)
              return (
                <div key={u.uid} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <span style={{
                    fontSize: '1.2rem', width: '28px', textAlign: 'center', fontWeight: 700,
                    color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#D97706' : 'var(--text-sub)',
                  }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                  </span>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '13px', fontFamily: "'Sora', sans-serif",
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>{u.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', letterSpacing: '0.01em' }}>
                      {isXp ? `${value.toLocaleString('it-IT')} XP` : `${value.toLocaleString('it-IT')} passi`}
                    </p>
                  </div>
                  <div style={{ height: '4px', width: '60px', background: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(value / maxVal * 100)}%`, background: i === 0 ? '#F59E0B' : 'var(--indigo)', borderRadius: '2px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CHALLENGES TAB */}
        {!loading && tab === 'sfide' && (challenges.length > 0 ? challenges : DEMO_CHALLENGES).map((c, idx) => {
          const isParticipant = user ? c.participants.includes(user.uid) : false
          const progressPct = Math.min(100, Math.round((Date.now() - c.startDate) / (c.endDate - c.startDate) * 100))
          const iconColor = TYPE_COLORS[c.type] ?? 'var(--indigo)'
          const typeEmoji = TYPE_ICONS[c.type] ?? '🏆'

          // Consistent demo % based on challenge id hash
          const demoProgress = c.id.startsWith('demo') ? ((c.id.charCodeAt(5) ?? 5) * 7 % 70) + 15 : progressPct

          return (
            <div key={c.id} className={`animate-up-${Math.min(idx + 1, 4)}`} style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              {/* ── Colored header band ── */}
              <div style={{
                background: `linear-gradient(135deg, ${iconColor} 0%, ${iconColor}bb 100%)`,
                padding: '16px 18px 14px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Watermark */}
                <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '80px', opacity: 0.12, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
                  {typeEmoji}
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    {/* Type + period badge */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.18)', borderRadius: '20px', padding: '3px 9px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {typeEmoji} {c.type}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.18)', borderRadius: '20px', padding: '3px 9px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {PERIOD_LABEL[c.period]}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', lineHeight: 1.2, letterSpacing: '0.01em', fontFamily: "'Sora', sans-serif" }}>
                      {c.title || `Sfida ${c.type}`}
                    </h3>
                    {c.prize.brandName && (
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', marginTop: '4px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                        SPONSOR: {c.prize.brandName.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>
                    {c.fitnessLevel === 'all' ? 'TUTTI' : c.fitnessLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '14px 18px 16px' }}>

              {/* Progress section */}
              <div style={{ marginBottom: '12px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', letterSpacing: '0.01em' }}>Progresso Attuale</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: iconColor }}>{demoProgress}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${demoProgress}%`, background: `linear-gradient(90deg, ${iconColor}, ${iconColor}aa)`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>

              {/* Prize mini card */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '12px',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
              }}>
                <span style={{ fontSize: '16px' }}>🎁</span>
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
                    PREMIO IN PALIO
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>
                    {c.prize.value}
                  </p>
                </div>
              </div>

              {/* Bottom row: atleti + buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-sub)', letterSpacing: '0.01em', display: 'block' }}>
                    👥 {c.participants.length >= 1000 ? `${(c.participants.length / 1000).toFixed(1)}k` : c.participants.length} atleti
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-sub)', letterSpacing: '0.01em' }}>
                    ⏱️ {daysLeft(c.endDate)} rimasti
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isParticipant && (
                    <button
                      onClick={() => handleJoin(c.id)}
                      disabled={joining === c.id}
                      style={{
                        background: joining === c.id ? 'var(--bg-surface)' : 'var(--gradient)',
                        color: joining === c.id ? 'var(--text-sub)' : 'white',
                        padding: '8px 14px', fontSize: '12px',
                        borderRadius: '10px', border: 'none', cursor: joining === c.id ? 'not-allowed' : 'pointer',
                        fontFamily: "'Sora', sans-serif",
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        letterSpacing: '0.02em',
                      }}>
                      {joining === c.id ? '...' : 'Partecipa'}
                    </button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    style={{
                      background: expandedId === c.id ? 'var(--indigo)' : 'var(--indigo-light)',
                      color: expandedId === c.id ? 'white' : 'var(--indigo)',
                      padding: '8px 14px', fontSize: '12px',
                      borderRadius: '10px', border: 'none', cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      transition: 'all 0.2s',
                    }}>
                    {expandedId === c.id ? 'Chiudi ✕' : 'Dettagli'}
                  </button>
                </div>
              </div>

              {/* Leaderboard for participants */}
              {isParticipant && (
                <div style={{ marginTop: '12px' }}>
                  <LeaderboardCard entries={c.leaderboard} currentUserId={user?.uid ?? ''} />
                </div>
              )}

              {/* Expanded details panel */}
              {expandedId === c.id && (
                <div style={{ marginTop: '14px', padding: '14px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Info sfida</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Tipo', value: `${typeEmoji} ${c.type}` },
                      { label: 'Periodo', value: PERIOD_LABEL[c.period] },
                      { label: 'Livello', value: c.fitnessLevel },
                      { label: 'Partecipanti', value: `${c.participants.length}` },
                      { label: 'Inizio', value: new Date(c.startDate).toLocaleDateString('it-IT') },
                      { label: 'Fine', value: new Date(c.endDate).toLocaleDateString('it-IT') },
                    ].map(row => (
                      <div key={row.label} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '8px 10px' }}>
                        <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{row.label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px', textTransform: 'capitalize' }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>{/* end card body */}
            </div>
          )
        })}
      </div>

      {showCreate && (
        <CreateChallengeModal onSave={() => load()} onClose={() => setShowCreate(false)} />
      )}
    </Layout>
  )
}
