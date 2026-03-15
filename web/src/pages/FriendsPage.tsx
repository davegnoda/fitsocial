import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFriends, getPendingRequests, acceptFriendRequest, sendFriendRequest } from '../services/friendService'
import { searchUserByEmail } from '../services/userService'
import Layout from '../components/Layout'
import type { UserProfile } from '../types'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #0A84FF, #BF5AF2)',
  'linear-gradient(135deg, #FF375F, #FF9F0A)',
  'linear-gradient(135deg, #30D158, #5AC8FA)',
  'linear-gradient(135deg, #BF5AF2, #FF375F)',
  'linear-gradient(135deg, #FF9F0A, #FF375F)',
  'linear-gradient(135deg, #5AC8FA, #0A84FF)',
]

function Avatar({ name, size = 40, index = 0 }: { name: string; size?: number; index?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: size * 0.4,
        color: '#FFFFFF',
        flexShrink: 0,
      }}
    >
      {name?.slice(0, 2).toUpperCase() ?? '??'}
    </div>
  )
}

const MOCK_FEED = [
  { action: 'ha corso', value: '5.2 km', icon: '🏃', time: '2h fa', color: '#30D158' },
  { action: 'ha raggiunto', value: '10.000 passi', icon: '👟', time: '4h fa', color: '#0A84FF' },
  { action: 'ha vinto', value: 'sfida settimanale', icon: '🏆', time: '1g fa', color: '#FF9F0A' },
  { action: 'nuovo streak', value: '7 giorni 🔥', icon: '🔥', time: '1g fa', color: '#FF375F' },
]

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [pending, setPending] = useState<{ uid: string; profile: UserProfile }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [tab, setTab] = useState<'feed' | 'friends' | 'search'>('feed')

  const reload = async () => {
    if (!user) return
    const [f, p] = await Promise.all([getFriends(user.uid), getPendingRequests(user.uid)])
    setFriends(f)
    setPending(p)
    setLoading(false)
  }

  useEffect(() => { reload() }, [user])

  const handleAccept = async (friendId: string) => {
    if (!user) return
    await acceptFriendRequest(user.uid, friendId)
    reload()
  }

  const handleSendRequest = async () => {
    if (!user || !searchEmail.trim()) return
    setSending(true)
    setSendMsg('')
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

  return (
    <Layout>
      {/* Header */}
      <div
        className="relative px-5 pt-12 pb-0 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1A0A2E 0%, #0A1A1A 60%, #060B17 100%)', borderBottom: '1px solid #182035' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,55,95,0.1) 0%, transparent 70%)' }} />

        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#FF375F' }}>Social</p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}>
          AMICI
        </h1>
        <p className="text-sm mt-1 mb-4" style={{ color: '#8A8A96' }}>
          {friends.length} amici · {pending.length} richieste
        </p>

        {/* Tabs */}
        <div className="flex gap-1 -mb-px">
          {[
            { key: 'feed', label: 'Feed', icon: '📰' },
            { key: 'friends', label: 'Amici', icon: '👥' },
            { key: 'search', label: 'Cerca', icon: '🔍' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'feed' | 'friends' | 'search')}
              className="px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all"
              style={{
                background: tab === t.key ? '#0E1424' : 'transparent',
                color: tab === t.key ? '#F8F8FC' : '#8A8A96',
                borderBottom: tab === t.key ? '2px solid #FF375F' : '2px solid transparent',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#FF375F', borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* FEED TAB */}
        {!loading && tab === 'feed' && (
          <div className="space-y-3">
            {/* Pending requests banner */}
            {pending.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(135deg, rgba(255,55,95,0.1), rgba(255,55,95,0.05))', border: '1px solid rgba(255,55,95,0.25)' }}
              >
                <p className="text-sm font-bold" style={{ color: '#FF375F' }}>
                  🔔 {pending.length} richiesta{pending.length > 1 ? 'e' : ''} in attesa
                </p>
                <div className="mt-3 space-y-2">
                  {pending.map(({ uid, profile: p }, i) => (
                    <div key={uid} className="flex items-center gap-3">
                      <Avatar name={p.name ?? '?'} index={i} />
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: '#F8F8FC' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: '#8A8A96' }}>{p.city}</p>
                      </div>
                      <button
                        onClick={() => handleAccept(uid)}
                        className="px-4 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #FF375F, #FF9F0A)', color: '#FFF' }}
                      >
                        Accetta
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity feed */}
            {friends.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4 animate-float">🏃</div>
                <p className="font-bold text-lg" style={{ color: '#F8F8FC' }}>Il feed è vuoto</p>
                <p className="text-sm mt-2" style={{ color: '#8A8A96' }}>Aggiungi amici per vedere le loro attività</p>
                <button onClick={() => setTab('search')} className="mt-4 px-6 py-2.5 rounded-full text-sm font-bold" style={{ background: 'linear-gradient(135deg, #FF375F, #BF5AF2)', color: '#FFF' }}>
                  Trova amici →
                </button>
              </div>
            ) : (
              friends.map((f, fi) => {
                const activity = MOCK_FEED[fi % MOCK_FEED.length]
                return (
                  <div key={f.uid} className="rounded-2xl p-4" style={{ background: '#0E1424', border: '1px solid #182035' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar name={f.name ?? '?'} index={fi} size={44} />
                      <div className="flex-1">
                        <p className="font-bold" style={{ color: '#F8F8FC' }}>{f.name}</p>
                        <p className="text-xs" style={{ color: '#8A8A96' }}>{f.city} · Lv.{f.level}</p>
                      </div>
                      <span className="text-xs" style={{ color: '#283650' }}>{activity.time}</span>
                    </div>
                    <div
                      className="rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{ background: `${activity.color}10`, border: `1px solid ${activity.color}25` }}
                    >
                      <span className="text-2xl">{activity.icon}</span>
                      <p className="text-sm" style={{ color: '#D0D0D8' }}>
                        <span style={{ fontWeight: 600 }}>{activity.action}</span>{' '}
                        <span style={{ color: activity.color, fontWeight: 700 }}>{activity.value}</span>
                      </p>
                    </div>
                    <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #182035' }}>
                      {['👏 Bravo!', '🔥 Top!', '💪 Forza!'].map(r => (
                        <button key={r} className="text-xs font-semibold transition-opacity hover:opacity-60" style={{ color: '#8A8A96' }}>{r}</button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* FRIENDS TAB */}
        {!loading && tab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👥</div>
                <p className="font-bold" style={{ color: '#F8F8FC' }}>Nessun amico ancora</p>
                <p className="text-sm mt-1" style={{ color: '#8A8A96' }}>Cerca qualcuno con cui allenarti!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f, i) => (
                  <div key={f.uid} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#0E1424', border: '1px solid #182035' }}>
                    <Avatar name={f.name ?? '?'} index={i} size={48} />
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: '#F8F8FC' }}>{f.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#8A8A96' }}>
                        📍 {f.city || 'N/A'} · ⚡ Lv.{f.level} · 🔥 {f.streak ?? 0}gg
                      </p>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(10,132,255,0.12)', border: '1px solid rgba(10,132,255,0.25)', color: '#0A84FF' }}
                    >
                      Sfida
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {!loading && tab === 'search' && (
          <div>
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(191,90,242,0.08), rgba(255,55,95,0.05))', border: '1px solid rgba(191,90,242,0.2)' }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: '#BF5AF2' }}>🔍 Cerca per email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="amico@email.com"
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#0A0F1E', border: '1px solid #1E2D45', color: '#F8F8FC' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(191,90,242,0.5)')}
                  onBlur={e => (e.target.style.borderColor = '#1E2D45')}
                />
                <button
                  onClick={handleSendRequest}
                  disabled={sending || !searchEmail}
                  className="px-4 py-3 rounded-xl font-bold text-sm"
                  style={{ background: sending ? 'rgba(191,90,242,0.3)' : 'linear-gradient(135deg, #BF5AF2, #FF375F)', color: '#FFF', opacity: !searchEmail ? 0.5 : 1 }}
                >
                  {sending ? '...' : 'Invia'}
                </button>
              </div>
              {sendMsg && <p className="text-sm mt-2 font-semibold" style={{ color: sendMsg.startsWith('✅') ? '#30D158' : '#FF453A' }}>{sendMsg}</p>}
            </div>

            {/* Suggestions */}
            <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Suggeriti</p>
            <div className="space-y-2">
              {['Marco R.', 'Giulia M.', 'Luca T.', 'Sara B.'].map((name, i) => (
                <div key={name} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#0E1424', border: '1px solid #182035' }}>
                  <Avatar name={name} index={i + 2} size={44} />
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: '#F8F8FC' }}>{name}</p>
                    <p className="text-xs" style={{ color: '#8A8A96' }}>Lv.{i + 2} · {['Milano', 'Roma', 'Torino', 'Napoli'][i]}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.25)', color: '#FF375F' }}>
                    + Aggiungi
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
