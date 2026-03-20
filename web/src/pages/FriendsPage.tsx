import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getFriends, getPendingRequests, acceptFriendRequest, sendFriendRequest, getSuggestedUsers } from '../services/friendService'
import { getTodayActivity } from '../services/activityService'
import { searchUserByEmail } from '../services/userService'
import { addNotification } from '../services/notificationService'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import type { UserProfile, Activity } from '../types'

const AVATAR_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0D9488', '#EA580C', '#DB2777']

function Avatar({ name, idx = 0, size = 40 }: { name: string; idx?: number; size?: number }) {
  return (
    <div className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size,
        background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        color: 'white', fontSize: size * 0.36,
        fontWeight: 700, fontFamily: "'Sora', sans-serif",
        borderRadius: `${size * 0.28}px`,
      }}>
      {name?.slice(0, 2).toUpperCase() ?? '??'}
    </div>
  )
}

export default function FriendsPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [pending, setPending] = useState<{ uid: string; profile: UserProfile }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [tab, setTab] = useState<'feed' | 'friends' | 'search'>('feed')
  const [friendActivities, setFriendActivities] = useState<Map<string, Activity | null>>(new Map())
  const [suggestions, setSuggestions] = useState<UserProfile[]>([])
  const [reactedTo, setReactedTo] = useState<Set<string>>(new Set())
  const [discoverIdx, setDiscoverIdx] = useState(0)
  const [swipeAnim, setSwipeAnim] = useState<'left' | 'right' | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('fitsocial_favorites') ?? '[]')) }
    catch { return new Set() }
  })
  const toggleFav = (uid: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      localStorage.setItem('fitsocial_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const reload = async () => {
    if (!user) return
    try {
      const timeout = new Promise<[UserProfile[], { uid: string; profile: UserProfile }[]]>((resolve) =>
        setTimeout(() => resolve([[], []]), 2500)
      )
      const [f, p] = await Promise.race([
        Promise.all([getFriends(user.uid), getPendingRequests(user.uid)]),
        timeout,
      ])
      setFriends(f); setPending(p)

      // Fetch friend activities
      const actMap = new Map<string, Activity | null>()
      await Promise.all(f.map(async friend => {
        const act = await getTodayActivity(friend.uid).catch(() => null)
        actMap.set(friend.uid, act)
      }))
      setFriendActivities(actMap)
    } catch {
      // keep empty state on error
    }
    setLoading(false)
  }

  useEffect(() => { reload() }, [user])

  useEffect(() => {
    if (!user || !profile) return
    getSuggestedUsers(user.uid, profile.city || '').then(setSuggestions).catch(() => {})
  }, [user, profile?.uid])

  const handleAccept = async (friendId: string) => {
    if (!user) return
    await acceptFriendRequest(user.uid, friendId)
    reload()
  }

  const handleSendRequest = async () => {
    if (!user || !searchEmail.trim()) return
    setSending(true); setSendMsg('')
    try {
      const found = await searchUserByEmail(searchEmail)
      if (!found) { setSendMsg('❌ Utente non trovato'); return }
      if (found.uid === user.uid) { setSendMsg('❌ Sei tu stesso!'); return }
      await sendFriendRequest(user.uid, found.uid)
      setSendMsg('✅ Richiesta inviata a ' + found.name + '!')
      setSearchEmail('')
    } catch {
      setSendMsg('❌ Errore, riprova')
    } finally {
      setSending(false)
    }
  }

  const handleReact = (friendUid: string, friendName: string, reaction: string) => {
    if (!user || !profile || reactedTo.has(`${friendUid}-${reaction}`)) return
    setReactedTo(prev => new Set([...prev, `${friendUid}-${reaction}`]))
    addNotification(friendUid, {
      type: 'reaction',
      title: `${reaction} da ${profile.name}`,
      body: `${profile.name} ti ha incoraggiato durante l'allenamento!`,
      read: false,
      createdAt: Date.now(),
    }).catch(() => {})
    void friendName
  }

  const TABS = [
    { key: 'feed', label: 'Feed' },
    { key: 'friends', label: 'Amici' },
    { key: 'search', label: '🔥 Scopri' },
  ]

  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeAnim) return
    const card = suggestions[discoverIdx]
    if (!card) return
    setSwipeAnim(direction)
    if (direction === 'right' && user && !sentTo.has(card.uid)) {
      sendFriendRequest(user.uid, card.uid).catch(() => {})
      setSentTo(prev => new Set([...prev, card.uid]))
    }
    setTimeout(() => {
      setDiscoverIdx(i => i + 1)
      setSwipeAnim(null)
    }, 320)
  }

  const SPORT_TAGS: Record<string, string[]> = {
    beginner: ['🚶 Camminata', '🧘 Yoga', '🏊 Nuoto'],
    intermediate: ['🏃 Running', '🚴 Ciclismo', '💪 Gym'],
    advanced: ['⚡ HIIT', '🏋️ Crossfit', '🏅 Maratona'],
  }

  return (
    <Layout>
      {/* HEADER */}
      <div className="animate-fade" style={{ padding: '52px 20px 0' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Social</p>
        <h1 className="font-display" style={{ fontSize: '2.4rem', color: 'var(--text)', lineHeight: 1 }}>Amici 👥</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '4px', marginBottom: '20px' }}>
          {friends.length} amici{pending.length > 0 ? ` · ${pending.length} richieste in attesa` : ''}
        </p>

        {/* Tab pills */}
        <div className="flex gap-2" style={{ marginBottom: '4px' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{
                padding: '8px 20px', fontSize: '0.85rem',
                borderRadius: '30px', border: 'none', cursor: 'pointer',
                background: tab === t.key ? 'var(--gradient)' : 'var(--bg-surface)',
                color: tab === t.key ? 'white' : 'var(--text-sub)',
                fontFamily: "'Sora', sans-serif",
                fontWeight: 600,
                boxShadow: tab === t.key ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* FEED */}
        {!loading && tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.length > 0 && (
              <div style={{
                background: '#FEF3C7', borderRadius: 'var(--radius)',
                padding: '14px 16px', border: '1px solid #FDE68A',
                marginBottom: '4px',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  🔔 {pending.length} richiesta{pending.length > 1 ? 'e' : ''} in attesa
                </p>
                {pending.map(({ uid, profile: p }, i) => (
                  <div key={uid} className="flex items-center gap-3">
                    <Avatar name={p.name ?? '?'} idx={i} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{p.city}</p>
                    </div>
                    <button onClick={() => handleAccept(uid)}
                      style={{
                        background: 'var(--gradient)', color: 'white', padding: '6px 14px',
                        fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontFamily: "'Sora', sans-serif",
                      }}>
                      Accetta
                    </button>
                  </div>
                ))}
              </div>
            )}

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <span className="animate-float" style={{ fontSize: '3.5rem', display: 'block' }}>🏃</span>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginTop: '16px' }}>Feed vuoto</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Aggiungi amici per vedere le loro attività</p>
                <button onClick={() => setTab('search')}
                  style={{
                    marginTop: '16px', background: 'var(--gradient)', color: 'white',
                    padding: '10px 24px', fontSize: '14px', fontWeight: 700,
                    borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                  }}>
                  Trova amici →
                </button>
              </div>
            ) : (
              friends.map((f, fi) => {
                const act = friendActivities.get(f.uid)
                const feedItem = act && act.steps > 0
                  ? { action: 'ha fatto', value: `${act.steps.toLocaleString('it-IT')} passi`, icon: '👟', color: '#2563EB', bg: '#EFF6FF' }
                  : act && act.workouts && act.workouts.length > 0
                  ? { action: 'si è allenato', value: `${act.workouts[0].type} ${act.workouts[0].duration}min`, icon: '🏃', color: '#0D9488', bg: '#F0FDFA' }
                  : { action: 'nessuna attività', value: 'oggi', icon: '😴', color: '#94A3B8', bg: '#F1F5F9' }
                return (
                  <div key={f.uid} style={{
                    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                    padding: '16px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)',
                  }}>
                    <div className="flex items-center gap-3 mb-3">
                      <button onClick={() => navigate(`/user/${f.uid}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar name={f.name ?? '?'} idx={fi} size={40} />
                      </button>
                      <div style={{ flex: 1 }}>
                        <button onClick={() => navigate(`/user/${f.uid}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--indigo)', lineHeight: 1.2 }}>{f.name}</p>
                        </button>
                        <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{f.city} · Lv.{f.level}</p>
                      </div>
                      <button onClick={(e) => toggleFav(f.uid, e)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '20px', padding: '2px', lineHeight: 1,
                        opacity: favorites.has(f.uid) ? 1 : 0.3,
                        transition: 'opacity 0.15s, transform 0.15s',
                        transform: favorites.has(f.uid) ? 'scale(1.15)' : 'scale(1)',
                      }}>
                        {favorites.has(f.uid) ? '⭐' : '☆'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2"
                      style={{ padding: '10px 12px', borderRadius: '10px', background: feedItem.bg }}>
                      <span style={{ fontSize: '18px' }}>{feedItem.icon}</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                        {feedItem.action}{' '}
                        <span style={{ color: feedItem.color, fontWeight: 700 }}>{feedItem.value}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {['👏 Bravo!', '🔥 Top!', '💪 Forza!'].map(r => {
                        const sent = reactedTo.has(`${f.uid}-${r}`)
                        return (
                          <button key={r} onClick={() => handleReact(f.uid, f.name, r)}
                            style={{
                              background: sent ? 'var(--indigo-light)' : 'var(--bg-surface)',
                              border: `1px solid ${sent ? 'var(--indigo)' : 'var(--border)'}`,
                              padding: '4px 10px', borderRadius: '20px',
                              fontSize: '11px',
                              color: sent ? 'var(--indigo)' : 'var(--text-sub)',
                              cursor: sent ? 'default' : 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                              transition: 'all 0.15s',
                            }}>{sent ? '✓ Inviato' : r}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* FRIENDS LIST */}
        {!loading && tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <span style={{ fontSize: '3rem', display: 'block' }}>👥</span>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginTop: '12px', fontSize: '15px' }}>Nessun amico ancora</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Cerca qualcuno con cui allenarti!</p>
                <button onClick={() => setTab('search')}
                  style={{
                    marginTop: '16px', background: 'var(--gradient)', color: 'white',
                    padding: '10px 24px', fontSize: '14px', fontWeight: 700,
                    borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                  }}>
                  Scopri persone →
                </button>
              </div>
            ) : (
              friends.map((f, i) => (
                <div key={f.uid} className="flex items-center gap-3"
                  style={{
                    background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                    padding: '12px 14px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
                  }}>
                  <button onClick={() => navigate(`/user/${f.uid}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                    <Avatar name={f.name ?? '?'} idx={i} size={44} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <button onClick={() => navigate(`/user/${f.uid}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--indigo)', lineHeight: 1.2 }}>{f.name}</p>
                    </button>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      {f.city || '—'} · Lv.{f.level} · 🔥{f.streak ?? 0}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={(e) => toggleFav(f.uid, e)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '20px', padding: '2px', lineHeight: 1,
                      opacity: favorites.has(f.uid) ? 1 : 0.3,
                      transition: 'opacity 0.15s, transform 0.15s',
                      transform: favorites.has(f.uid) ? 'scale(1.15)' : 'scale(1)',
                    }}>
                      {favorites.has(f.uid) ? '⭐' : '☆'}
                    </button>
                    <button onClick={() => navigate('/challenges')}
                      style={{
                        background: 'var(--indigo-light)', border: 'none',
                        color: 'var(--indigo)', padding: '6px 14px', fontSize: '12px',
                        fontWeight: 700, borderRadius: '8px', cursor: 'pointer',
                        fontFamily: "'Sora', sans-serif",
                      }}>
                      Sfida
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DISCOVER — Tinder-style */}
        {!loading && tab === 'search' && (
          <div>
            {/* Card stack */}
            {discoverIdx < suggestions.length ? (() => {
              const card = suggestions[discoverIdx]
              const next = suggestions[discoverIdx + 1]
              const next2 = suggestions[discoverIdx + 2]
              const tags = SPORT_TAGS[card.fitnessLevel ?? 'intermediate'] ?? SPORT_TAGS.intermediate
              const avatarColor = AVATAR_COLORS[card.uid.charCodeAt(0) % AVATAR_COLORS.length]
              const tx = swipeAnim === 'left' ? -320 : swipeAnim === 'right' ? 320 : 0
              const rot = swipeAnim === 'left' ? -18 : swipeAnim === 'right' ? 18 : 0
              return (
                <div style={{ position: 'relative', height: '420px', marginBottom: '24px' }}>
                  {/* Card 3 (back) */}
                  {next2 && (
                    <div style={{
                      position: 'absolute', left: '8%', right: '8%', top: '16px',
                      height: '380px', borderRadius: '24px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      transform: 'scale(0.88)', opacity: 0.4, zIndex: 1,
                    }} />
                  )}
                  {/* Card 2 (middle) */}
                  {next && (
                    <div style={{
                      position: 'absolute', left: '4%', right: '4%', top: '8px',
                      height: '390px', borderRadius: '24px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      transform: 'scale(0.94)', opacity: 0.65, zIndex: 2,
                    }} />
                  )}
                  {/* Main card */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: 0,
                    height: '400px', borderRadius: '24px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    boxShadow: '0 16px 48px rgba(79,70,229,0.18)',
                    zIndex: 3, overflow: 'hidden',
                    transform: `translateX(${tx}px) rotate(${rot}deg)`,
                    opacity: swipeAnim ? 0 : 1,
                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                  }}>
                    {/* Gradient header */}
                    <div style={{
                      background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColor}cc 100%)`,
                      padding: '28px 24px 20px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      position: 'relative',
                    }}>
                      {/* Like / Nope indicator */}
                      {swipeAnim === 'right' && (
                        <div style={{ position: 'absolute', top: '16px', left: '16px', border: '3px solid #22C55E', borderRadius: '8px', padding: '4px 10px', transform: 'rotate(-12deg)' }}>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: '#22C55E', letterSpacing: '0.05em' }}>CONNETTI</span>
                        </div>
                      )}
                      {swipeAnim === 'left' && (
                        <div style={{ position: 'absolute', top: '16px', right: '16px', border: '3px solid #EF4444', borderRadius: '8px', padding: '4px 10px', transform: 'rotate(12deg)' }}>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: '#EF4444', letterSpacing: '0.05em' }}>PASSA</span>
                        </div>
                      )}
                      {/* Big avatar */}
                      <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.25)',
                        border: '3px solid rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px', fontWeight: 700, color: 'white',
                        fontFamily: "'Sora', sans-serif",
                        marginBottom: '10px',
                      }}>
                        {card.name?.slice(0, 2).toUpperCase() ?? '??'}
                      </div>
                      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{card.name}</h2>
                      {card.city && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>📍 {card.city}</p>}
                    </div>
                    {/* Card body */}
                    <div style={{ padding: '16px 20px' }}>
                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        {[
                          { icon: '⭐', label: `Lv.${card.level ?? 1}` },
                          { icon: '🔥', label: `${card.streak ?? 0} streak` },
                          { icon: '💎', label: `${(card.xp ?? 0).toLocaleString('it-IT')} XP` },
                        ].map(s => (
                          <div key={s.label} style={{
                            flex: 1, background: 'var(--bg-surface)', borderRadius: '10px',
                            padding: '8px 6px', textAlign: 'center',
                            border: '1px solid var(--border)',
                          }}>
                            <span style={{ fontSize: '14px', display: 'block' }}>{s.icon}</span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>{s.label}</span>
                          </div>
                        ))}
                      </div>
                      {/* Sport tags */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {tags.map(t => (
                          <span key={t} style={{
                            background: 'var(--indigo-light)', color: 'var(--indigo)',
                            borderRadius: '20px', padding: '5px 12px',
                            fontSize: '12px', fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <button onClick={() => handleSwipe('left')} style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'white', border: '2px solid #FCA5A5',
                      fontSize: '26px', cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(239,68,68,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.15s',
                    }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >❌</button>
                    <button onClick={() => navigate(`/user/${card.uid}`)} style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--bg-surface)', border: '1.5px solid var(--border)',
                      fontSize: '18px', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>👤</button>
                    <button onClick={() => handleSwipe('right')} style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'white', border: '2px solid #86EFAC',
                      fontSize: '26px', cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(34,197,94,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.15s',
                    }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >💜</button>
                  </div>
                </div>
              )
            })() : (
              <div style={{ textAlign: 'center', padding: '40px 0 32px' }}>
                <span style={{ fontSize: '3rem', display: 'block' }}>🎉</span>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '12px', fontFamily: "'Sora', sans-serif" }}>Hai visto tutti!</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '6px' }}>Ricontrolla più tardi per nuovi atleti nella tua zona.</p>
                <button onClick={() => { setDiscoverIdx(0); setSentTo(new Set()) }}
                  style={{ marginTop: '16px', background: 'var(--gradient)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
                  Ricarica
                </button>
              </div>
            )}

            {/* Counter */}
            {discoverIdx < suggestions.length && (
              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-sub)', marginBottom: '16px' }}>
                {suggestions.length - discoverIdx} persone vicino a te
              </p>
            )}

            {/* Email search — secondary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Cerca per email
              </p>
              <div className="flex gap-2">
                <input type="email" placeholder="amico@email.com" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                  style={{
                    flex: 1, background: 'var(--bg-card)',
                    border: '1.5px solid var(--border)', color: 'var(--text)',
                    padding: '12px 14px', fontSize: '14px', borderRadius: '12px',
                    outline: 'none', fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <button onClick={handleSendRequest} disabled={sending || !searchEmail}
                  style={{
                    background: sending || !searchEmail ? 'var(--bg-surface)' : 'var(--gradient)',
                    color: sending || !searchEmail ? 'var(--text-sub)' : 'white',
                    padding: '12px 18px', fontSize: '13px', fontWeight: 700,
                    borderRadius: '12px', border: 'none', cursor: sending || !searchEmail ? 'not-allowed' : 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    boxShadow: sending || !searchEmail ? 'none' : '0 4px 12px rgba(79,70,229,0.3)',
                  }}>
                  {sending ? '...' : 'Invia'}
                </button>
              </div>
              {sendMsg && (
                <p style={{
                  fontSize: '13px', fontWeight: 600, marginTop: '10px',
                  color: sendMsg.startsWith('✅') ? 'var(--green)' : '#DC2626',
                  background: sendMsg.startsWith('✅') ? 'var(--green-bg)' : '#FEF2F2',
                  padding: '10px 14px', borderRadius: '10px',
                }}>
                  {sendMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
