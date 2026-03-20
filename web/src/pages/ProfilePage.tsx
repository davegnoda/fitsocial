import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { updateUserProfile } from '../services/userService'
import { getTotalActivities } from '../services/activityService'
import { getWonChallenges } from '../services/challengeService'
import { getFriends } from '../services/friendService'
import { getUnlockedAchievements, BADGES } from '../services/achievementService'
import EditProfileModal from '../components/EditProfileModal'
import Layout from '../components/Layout'
import type { UserProfile, Achievement } from '../types'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { profile, refetch } = useUser()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [totalActivities, setTotalActivities] = useState(0)
  const [challengesWon, setChallengesWon] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  useEffect(() => {
    if (!user) return
    Promise.all([
      getTotalActivities(user.uid),
      getWonChallenges(user.uid),
      getFriends(user.uid),
      getUnlockedAchievements(user.uid),
    ]).then(([acts, won, frs, achs]) => {
      setTotalActivities(acts)
      setChallengesWon(won)
      setFriendCount(frs.length)
      setAchievements(achs)
      setStatsLoading(false)
    }).catch(() => setStatsLoading(false))
  }, [user])

  const handleSaveProfile = async (data: Partial<UserProfile>) => {
    if (!profile) return
    await updateUserProfile(profile.uid, data)
    refetch()
  }

  return (
    <Layout>
      {/* WHITE HEADER */}
      <div className="animate-fade" style={{
        background: 'var(--bg)',
        padding: '52px 20px 20px',
      }}>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex items-center justify-center"
            style={{
              width: 72, height: 72, flexShrink: 0,
              background: 'var(--gradient)',
              color: 'white',
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.6rem',
              fontWeight: 700,
              borderRadius: '50%',
              boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
            }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}>
              {profile?.name ?? 'Atleta'}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--indigo)', fontWeight: 600, marginTop: '4px', letterSpacing: '0.01em' }}>
              Livello {level} · Atleta Verificato ✓
            </p>
          </div>
          <button onClick={() => setShowEdit(true)}
            style={{
              background: 'var(--indigo-light)',
              border: 'none',
              color: 'var(--indigo)',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.01em',
            }}>
            Modifica
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* STATS ROW */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'ATTIVITÀ', value: totalActivities.toString() },
            { label: 'SFIDE VINTE', value: challengesWon.toString() },
            { label: 'PUNTI', value: xp.toLocaleString() },
            { label: 'AMICI', value: friendCount.toString() },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              padding: '14px 10px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border)',
            }}>
              {statsLoading ? (
                <div style={{
                  height: '22px', borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  margin: '0 auto 6px',
                  width: '60%',
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
              ) : (
                <span style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'block',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}>{s.value}</span>
              )}
              <span style={{
                fontSize: '9px',
                color: 'var(--text-sub)',
                display: 'block',
                marginTop: '5px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
              }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* BADGE E TRAGUARDI */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
            Badge e Traguardi
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {BADGES.map(badge => {
              const unlocked = achievements.find(a => a.id === badge.id)
              return (
                <div key={badge.id} style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  background: unlocked ? 'var(--bg-card)' : 'var(--bg-surface)',
                  borderRadius: 'var(--radius)',
                  border: unlocked ? '1px solid var(--indigo)' : '1px solid var(--border)',
                  opacity: unlocked ? 1 : 0.5,
                  position: 'relative',
                }}>
                  <span style={{ fontSize: '28px', display: 'block' }}>{unlocked ? badge.icon : '🔒'}</span>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', marginTop: '6px', lineHeight: 1.2 }}>{badge.title}</p>
                  <p style={{ fontSize: '9px', color: 'var(--text-sub)', marginTop: '2px' }}>{badge.description}</p>
                  {unlocked && (
                    <p style={{ fontSize: '8px', color: 'var(--indigo)', marginTop: '4px', fontWeight: 600 }}>
                      Sbloccato {new Date(unlocked.unlockedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* AI COACH CARD */}
        <div style={{
          background: 'var(--indigo-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Robot icon */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--indigo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>
            🤖
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--indigo)',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.01em',
            }}>Coach Virtuale IA</p>
            <p style={{ fontSize: '11px', color: 'var(--indigo)', opacity: 0.75, marginTop: '2px', lineHeight: 1.4, letterSpacing: '0.01em' }}>
              Analizza i tuoi dati e ottimizza le performance
            </p>
          </div>
          {/* Button */}
          <button onClick={() => navigate('/stats')} style={{
            background: 'var(--gradient)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}>
            ✦ Analizza Dati
          </button>
        </div>

        {/* MENU */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
          {[
            {
              icon: '📊',
              label: 'Statistiche',
              sub: 'Grafici · record personali · allenamenti',
              action: () => navigate('/stats'),
            },
            {
              icon: '👥',
              label: 'Amici',
              sub: 'Cerca e gestisci i tuoi amici',
              action: () => navigate('/friends'),
            },
            {
              icon: '⚙️',
              label: 'Impostazioni',
              sub: 'Nome · città · livello fitness',
              action: () => navigate('/settings'),
            },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="flex items-center gap-3 w-full text-left"
              style={{
                padding: '14px 16px', background: 'var(--bg-card)',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)', cursor: 'pointer',
              }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '0.01em' }}>{item.label}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px', letterSpacing: '0.01em' }}>{item.sub}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-sub)">
                <path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.42z"/>
              </svg>
            </button>
          ))}
        </div>

        {/* LOGOUT */}
        <button onClick={logout}
          className="flex items-center gap-3 w-full text-left"
          style={{ padding: '14px 16px', marginTop: '8px', marginBottom: '8px', background: '#FFF5F5', borderRadius: 'var(--radius)', border: '1px solid #FEE2E2', cursor: 'pointer' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚪</div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', letterSpacing: '0.01em' }}>Esci dall'account</span>
        </button>
      </div>

      {showEdit && profile && (
        <EditProfileModal profile={profile} onSave={handleSaveProfile} onClose={() => setShowEdit(false)} />
      )}
    </Layout>
  )
}
