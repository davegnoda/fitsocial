import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getUserProfile } from '../services/userService'
import { getTotalActivities } from '../services/activityService'
import { getFriends, sendFriendRequest, isFriend } from '../services/friendService'
import { getUnlockedAchievements, BADGES } from '../services/achievementService'
import Layout from '../components/Layout'
import type { UserProfile, Achievement } from '../types'

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#EA580C', '#DB2777', '#6D28D9', '#059669']

function colorFromUid(uid: string) {
  let n = 0
  for (let i = 0; i < uid.length; i++) n = (n + uid.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[n]
}

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const { user } = useAuth()
  useUser() // keep auth context warm
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activities, setActivities] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [alreadyFriend, setAlreadyFriend] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = uid === user?.uid

  useEffect(() => {
    if (!uid) return
    const timeout = setTimeout(() => setLoading(false), 3000)
    Promise.all([
      getUserProfile(uid),
      getTotalActivities(uid).catch(() => 0),
      getFriends(uid).catch(() => []),
      getUnlockedAchievements(uid).catch(() => []),
      user ? isFriend(user.uid, uid).catch(() => false) : Promise.resolve(false),
    ]).then(([p, acts, frs, achs, friend]) => {
      setProfile(p)
      setActivities(acts)
      setFriendCount(frs.length)
      setAchievements(achs)
      setAlreadyFriend(friend as boolean)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => clearTimeout(timeout)
  }, [uid, user])

  const handleAddFriend = async () => {
    if (!user || !uid || sending || sent) return
    setSending(true)
    try {
      await sendFriendRequest(user.uid, uid)
      setSent(true)
    } catch {
      // silently fail — button remains clickable for retry
    }
    setSending(false)
  }

  const handleChallenge = () => {
    navigate('/challenges')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!profile) return (
    <Layout>
      <div style={{ padding: '80px 20px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem' }}>🔍</span>
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '12px' }}>Utente non trovato</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '16px', background: 'var(--gradient)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          Torna indietro
        </button>
      </div>
    </Layout>
  )

  const initials = profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const avatarColor = colorFromUid(profile.uid)
  const level = profile.level ?? 1
  const xp = profile.xp ?? 0
  const xpProgress = Math.min(100, Math.round(((xp % 1000) / 1000) * 100))

  return (
    <Layout>
      {/* BACK */}
      <div style={{ padding: '52px 20px 0' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--indigo)', fontWeight: 600, fontSize: '13px', padding: '0 0 16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Indietro
        </button>
      </div>

      {/* HERO */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ background: 'var(--gradient-hero)', borderRadius: 'var(--radius-xl)', padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, color: 'white',
              fontFamily: "'Sora', sans-serif",
              border: '3px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{profile.name}</h1>
              {profile.city && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>📍 {profile.city}</p>}
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: 600 }}>
                Livello {level} · {xp.toLocaleString('it-IT')} XP
              </p>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginTop: '16px', position: 'relative' }}>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${xpProgress}%`, height: '100%', background: 'white', borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>LV.{level}</span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>{xpProgress}% → LV.{level + 1}</span>
            </div>
          </div>

          {/* Action buttons — hidden on own profile */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', position: 'relative' }}>
              {!alreadyFriend && (
                <button onClick={handleAddFriend} disabled={sending || sent} style={{
                  flex: 1, padding: '10px', background: sent ? 'rgba(255,255,255,0.2)' : 'white',
                  color: sent ? 'rgba(255,255,255,0.8)' : 'var(--indigo)',
                  border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                  cursor: sent ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  {sent ? '✓ Richiesta inviata' : sending ? '...' : '+ Aggiungi amico'}
                </button>
              )}
              {alreadyFriend && (
                <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
                  ✓ Amici
                </div>
              )}
              <button onClick={handleChallenge} style={{
                flex: 1, padding: '10px', background: 'rgba(255,255,255,0.15)',
                color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                ⚡ Sfida
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'ATTIVITÀ', value: activities.toString(), icon: '🏃' },
            { label: 'STREAK', value: `${profile.streak ?? 0}🔥`, icon: '' },
            { label: 'AMICI', value: friendCount.toString(), icon: '👥' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius)',
              padding: '14px 10px', textAlign: 'center',
              boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text)', display: 'block', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-sub)', display: 'block', marginTop: '5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* BADGES */}
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
          Badge
        </h2>
        {achievements.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '20px' }}>Nessun badge ancora.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {BADGES.map(badge => {
              const unlocked = achievements.find(a => a.id === badge.id)
              return (
                <div key={badge.id} style={{
                  textAlign: 'center', padding: '12px 8px',
                  background: unlocked ? 'var(--bg-card)' : 'var(--bg-surface)',
                  borderRadius: 'var(--radius)',
                  border: unlocked ? '1px solid var(--indigo)' : '1px solid var(--border)',
                  opacity: unlocked ? 1 : 0.35,
                }}>
                  <span style={{ fontSize: '28px', display: 'block' }}>{badge.icon}</span>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', marginTop: '6px', lineHeight: 1.2 }}>{badge.title}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
