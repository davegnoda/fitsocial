import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import { getTopUsers, getTopUsersByRecentActivity } from '../services/userService'
import { hasConnectedDevice } from '../services/healthService'
import LeaderboardCard from '../components/LeaderboardCard'
import CreateChallengeModal from '../components/CreateChallengeModal'
import CreateDuelModal from '../components/CreateDuelModal'
import Layout from '../components/Layout'
import { getUserDuels } from '../services/duelService'
import type { Challenge, UserProfile, Duel, StreakBattle } from '../types'

const TYPE_ICONS: Record<string, string> = { distance: '📍', active_minutes: '⏱️', calories: '🔥', hr_zone_minutes: '❤️', workouts: '💪' }
const TYPE_COLORS: Record<string, string> = { distance: '#3B82F6', active_minutes: '#0D9488', calories: '#EF4444', hr_zone_minutes: '#DC2626', workouts: '#7C3AED' }
const SCORING_LABELS: Record<string, string> = { improvement: 'Miglioramento', consistency: 'Costanza', zone_training: 'Zone HR', composite: 'Composito' }

const PERIOD_LABEL: Record<string, string> = { daily: 'Oggi', weekly: 'Questa settimana', monthly: 'Questo mese' }

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#EA580C', '#DB2777', '#6D28D9', '#059669']

const DUEL_TYPE_ICONS: Record<string, string> = { steps: '👟', calories: '🔥', distance: '📍' }
const DUEL_TYPE_UNITS: Record<string, string> = { steps: 'passi', calories: 'kcal', distance: 'km' }


export default function ChallengesPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const navigate = useNavigate()
  const deviceConnected = hasConnectedDevice(profile?.connectedDevices ?? [])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [tab, setTab] = useState<'sfide' | 'global' | 'duelli' | 'streak'>('sfide')
  const [duels, setDuels] = useState<Duel[]>([])
  const [streakBattles] = useState<StreakBattle[]>([])
  const [topUsers, setTopUsers] = useState<UserProfile[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateDuel, setShowCreateDuel] = useState(false)
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
  useEffect(() => { if (user) getUserDuels(user.uid).then(setDuels).catch(() => {}) }, [user])
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

  const TABS = [{ key: 'sfide', label: 'Sfide' }, { key: 'global', label: 'Globale' }, { key: 'duelli', label: 'Duelli' }, { key: 'streak', label: 'Streak' }]

  const formatCountdown = (endsAt: number) => {
    const diff = endsAt - Date.now()
    if (diff <= 0) return 'Scaduto'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h >= 24) { const d = Math.floor(h / 24); return `${d}g ${h % 24}h` }
    return `${h}h ${m}m`
  }

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

        {/* Device required gate */}
        {!deviceConnected && (
          <div style={{
            background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #F59E0B33',
          }}>
            <span style={{ fontSize: '28px' }}>⌚</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', fontFamily: "'Sora', sans-serif" }}>
                Smartwatch richiesto
              </p>
              <p style={{ fontSize: '11px', color: '#A16207', lineHeight: 1.3, marginTop: '2px' }}>
                Collega un dispositivo per partecipare. Solo dati verificati contano nelle sfide.
              </p>
            </div>
            <button onClick={() => navigate('/settings')} style={{
              padding: '8px 14px', borderRadius: '10px', border: 'none',
              background: '#F59E0B', color: 'white',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
            }}>
              Collega
            </button>
          </div>
        )}

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

        <button onClick={() => {
            if (tab === 'duelli') setShowCreateDuel(true)
            else setShowCreate(true)
          }}
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
          {tab === 'duelli' ? '+ Crea Duello ⚔️' : tab === 'streak' ? '+ Crea Streak Battle 🔥' : '+ Crea Sfida'}
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

        {/* DUELS TAB */}
        {!loading && tab === 'duelli' && (() => {
          return (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
                ⚔️ I tuoi duelli · {duels.length}
              </p>
              {duels.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚔️</div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif", marginBottom: '6px' }}>Nessun duello attivo</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.4 }}>Sfida un amico in un duello 1v1!</p>
                </div>
              )}
              {duels.map((d, idx) => {
                const icon = DUEL_TYPE_ICONS[d.type] ?? '🏆'
                const unit = DUEL_TYPE_UNITS[d.type] ?? ''
                const cScore = d.scores[d.challenger] ?? 0
                const oScore = d.scores[d.opponent] ?? 0
                const totalScore = cScore + oScore || 1
                const cPct = Math.round((cScore / totalScore) * 100)
                const isCurrentUserOpponent = user && d.opponent === user.uid
                const cInitials = d.challengerName.slice(0, 2).toUpperCase()
                const oInitials = d.opponentName.slice(0, 2).toUpperCase()
                const cColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                const oColor = AVATAR_COLORS[(idx + 3) % AVATAR_COLORS.length]

                return (
                  <div key={d.id} style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-card)',
                    padding: '16px 18px',
                    marginBottom: '12px',
                    animation: 'slide-up 0.3s ease',
                    animationDelay: `${idx * 0.05}s`,
                    animationFillMode: 'both',
                  }}>
                    {/* Top row: status badge + type/duration */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: '20px',
                          background: d.status === 'active' ? 'rgba(16,185,129,0.12)' : d.status === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)',
                          color: d.status === 'active' ? '#10B981' : d.status === 'pending' ? '#F59E0B' : '#6B7280',
                          animation: d.status === 'active' ? 'pulse 2s infinite' : 'none',
                        }}>
                          {d.status === 'active' ? '● ATTIVO' : d.status === 'pending' ? '● IN ATTESA' : 'COMPLETATO'}
                        </span>
                        {d.bet && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                            padding: '3px 10px', borderRadius: '20px',
                            background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                          }}>
                            💰 {d.bet.amount} {d.bet.currency}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: '20px',
                          background: 'var(--bg-surface)', color: 'var(--text-sub)',
                        }}>
                          {icon} {d.type}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                          padding: '3px 10px', borderRadius: '20px',
                          background: 'var(--bg-surface)', color: 'var(--text-sub)',
                        }}>
                          ⏱️ {d.duration}
                        </span>
                      </div>
                    </div>

                    {/* VS Layout */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      {/* Challenger */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: cColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: "'Sora', sans-serif",
                          marginBottom: '6px',
                        }}>
                          {cInitials}
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
                          {d.challengerName}
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: cScore >= oScore ? 'var(--indigo)' : 'var(--text-sub)', fontFamily: "'Sora', sans-serif", marginTop: '2px' }}>
                          {cScore.toLocaleString('it-IT')}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-sub)', letterSpacing: '0.04em' }}>{unit}</p>
                      </div>

                      {/* VS badge */}
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: '11px', fontFamily: "'Sora', sans-serif",
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                      }}>
                        VS
                      </div>

                      {/* Opponent */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: oColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: "'Sora', sans-serif",
                          marginBottom: '6px',
                        }}>
                          {oInitials}
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
                          {d.opponentName}
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: oScore >= cScore ? 'var(--indigo)' : 'var(--text-sub)', fontFamily: "'Sora', sans-serif", marginTop: '2px' }}>
                          {oScore.toLocaleString('it-IT')}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-sub)', letterSpacing: '0.04em' }}>{unit}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '12px', background: 'var(--bg-surface)' }}>
                      <div style={{
                        width: `${cPct}%`, height: '100%',
                        background: 'var(--indigo)',
                        borderRadius: '4px 0 0 4px',
                        transition: 'width 0.8s ease',
                      }} />
                      <div style={{
                        width: `${100 - cPct}%`, height: '100%',
                        background: '#F59E0B',
                        borderRadius: '0 4px 4px 0',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>

                    {/* Bottom row: countdown + accept button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {d.status === 'active' && d.endsAt > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', letterSpacing: '0.02em' }}>
                          ⏳ {formatCountdown(d.endsAt)} rimasti
                        </span>
                      )}
                      {d.status === 'pending' && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#F59E0B', letterSpacing: '0.02em' }}>
                          In attesa di accettazione
                        </span>
                      )}
                      {d.status === 'completed' && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>Completato</span>
                      )}
                      {d.status === 'pending' && isCurrentUserOpponent && (
                        <button style={{
                          background: 'var(--gradient)',
                          color: 'white',
                          padding: '8px 18px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: "'Sora', sans-serif",
                          boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                          letterSpacing: '0.02em',
                          transition: 'all 0.2s',
                        }}>
                          Accetta ⚔️
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* CHALLENGES TAB */}
        {!loading && tab === 'sfide' && challenges.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif", marginBottom: '6px' }}>Nessuna sfida disponibile</p>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.4 }}>Crea la tua prima sfida!</p>
          </div>
        )}
        {!loading && tab === 'sfide' && challenges.map((c, idx) => {
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

        {/* STREAK BATTLES TAB */}
        {!loading && tab === 'streak' && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
              🔥 Streak Battles · {streakBattles.length}
            </p>
            {streakBattles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
                <p style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", marginBottom: '8px' }}>Streak Battles</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.5, maxWidth: '280px', margin: '0 auto 16px' }}>
                  Sfida i tuoi amici: allenati ogni giorno o sei eliminato! Ultimo sopravvissuto vince.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {['Giorno 1 → Tutti dentro', 'Salti? → Eliminato', 'Ultimo in piedi → Vince 🏆'].map(step => (
                    <span key={step} style={{
                      fontSize: '11px', fontWeight: 600, color: 'var(--indigo)',
                      background: 'var(--indigo-light)', padding: '5px 12px',
                      borderRadius: '20px',
                    }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {streakBattles.map((sb, idx) => {
              const survivorPct = sb.participants.length > 0 ? Math.round((sb.survivors.length / sb.participants.length) * 100) : 0
              return (
                <div key={sb.id} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '16px 18px',
                  marginBottom: '12px',
                  animation: 'slide-up 0.3s ease',
                  animationDelay: `${idx * 0.05}s`,
                  animationFillMode: 'both',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: '20px',
                      background: sb.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
                      color: sb.status === 'active' ? '#10B981' : '#6B7280',
                    }}>
                      {sb.status === 'active' ? '● ATTIVO' : 'COMPLETATO'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>
                      Iniziata: {new Date(sb.startDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px' }}>🔥</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                        {sb.survivors.length}/{sb.participants.length} sopravvissuti
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                        {sb.eliminated.length} eliminati
                      </p>
                    </div>
                  </div>

                  <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-surface)', marginBottom: '12px' }}>
                    <div style={{
                      width: `${survivorPct}%`, height: '100%',
                      background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                      borderRadius: '4px',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {sb.survivors.slice(0, 6).map((uid, si) => (
                      <div key={uid} style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: AVATAR_COLORS[si % AVATAR_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '10px', fontWeight: 700,
                        fontFamily: "'Sora', sans-serif",
                        border: '2px solid var(--bg-card)',
                        marginLeft: si === 0 ? 0 : -6,
                      }}>
                        {uid.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {sb.survivors.length > 6 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, marginLeft: '4px' }}>
                        +{sb.survivors.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateChallengeModal onSave={() => load()} onClose={() => setShowCreate(false)} />
      )}
      {showCreateDuel && (
        <CreateDuelModal onClose={() => setShowCreateDuel(false)} onCreated={() => { setShowCreateDuel(false) }} />
      )}
    </Layout>
  )
}
