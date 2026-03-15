import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFriends, getPendingRequests, acceptFriendRequest, sendFriendRequest } from '../services/friendService'
import { searchUserByEmail } from '../services/userService'
import Layout from '../components/Layout'
import type { UserProfile } from '../types'

const GRAD = [
  'linear-gradient(135deg,#C4FF00,#00D4B1)',
  'linear-gradient(135deg,#FF375F,#FF9F0A)',
  'linear-gradient(135deg,#3D9EFF,#A855F7)',
  'linear-gradient(135deg,#A855F7,#FF375F)',
  'linear-gradient(135deg,#FFB800,#FF375F)',
  'linear-gradient(135deg,#00D4B1,#3D9EFF)',
]

function Avatar({ name, idx = 0, size = 40 }: { name: string; idx?: number; size?: number }) {
  return (
    <div className="font-display flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: GRAD[idx % GRAD.length], color: '#000', fontSize: size * 0.35, borderRadius: '4px' }}>
      {name?.slice(0, 2).toUpperCase() ?? '??'}
    </div>
  )
}

const MOCK_FEED = [
  { action: 'ha corso', value: '5.2 km', icon: '🏃', time: '2h fa', color: 'var(--green)' },
  { action: 'ha raggiunto', value: '10.000 passi', icon: '👟', time: '4h fa', color: 'var(--blue)' },
  { action: 'ha vinto', value: 'sfida settimanale', icon: '🏆', time: '1g fa', color: 'var(--amber)' },
  { action: 'nuovo streak', value: '7 giorni', icon: '🔥', time: '1g fa', color: 'var(--orange)' },
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
    setFriends(f); setPending(p); setLoading(false)
  }

  useEffect(() => { reload() }, [user])

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

  const TABS = [
    { key: 'feed', label: 'FEED' },
    { key: 'friends', label: 'AMICI' },
    { key: 'search', label: 'CERCA' },
  ]

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '40px 20px 0', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--pink)', letterSpacing: '0.2em', marginBottom: '4px' }}>SOCIAL</p>
        <h1 className="font-display" style={{ fontSize: '3.5rem', color: 'var(--text)', lineHeight: 0.9 }}>AMICI</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '6px', marginBottom: '20px' }}>
          {friends.length} amici · {pending.length} richieste
        </p>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="font-display"
              style={{
                padding: '10px 18px', fontSize: '1rem', letterSpacing: '0.08em',
                color: tab === t.key ? 'var(--lime)' : 'var(--text-sub)',
                borderBottom: tab === t.key ? '2px solid var(--lime)' : '2px solid transparent',
                background: 'transparent', transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--pink)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* FEED */}
        {!loading && tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {pending.length > 0 && (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pink)', letterSpacing: '0.12em', marginBottom: '10px' }}>
                  🔔 {pending.length} RICHIESTA{pending.length > 1 ? 'E' : ''} IN ATTESA
                </p>
                {pending.map(({ uid, profile: p }, i) => (
                  <div key={uid} className="flex items-center gap-3" style={{ paddingBottom: '8px' }}>
                    <Avatar name={p.name ?? '?'} idx={i} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{p.city}</p>
                    </div>
                    <button onClick={() => handleAccept(uid)} className="font-display"
                      style={{ background: 'var(--lime)', color: '#000', padding: '6px 14px', fontSize: '0.9rem', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>
                      ACCETTA
                    </button>
                  </div>
                ))}
              </div>
            )}

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <span className="font-display animate-float" style={{ fontSize: '3.5rem', color: 'var(--pink)', display: 'block' }}>🏃</span>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginTop: '16px' }}>Feed vuoto</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Aggiungi amici per vedere le loro attività</p>
                <button onClick={() => setTab('search')} className="font-display"
                  style={{ marginTop: '16px', background: 'var(--lime)', color: '#000', padding: '10px 24px', fontSize: '1rem', letterSpacing: '0.06em', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                  TROVA AMICI →
                </button>
              </div>
            ) : (
              friends.map((f, fi) => {
                const act = MOCK_FEED[fi % MOCK_FEED.length]
                return (
                  <div key={f.uid} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar name={f.name ?? '?'} idx={fi} size={40} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{f.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{f.city} · Lv.{f.level}</p>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{act.time}</span>
                    </div>
                    <div className="flex items-center gap-2"
                      style={{ padding: '10px 12px', borderLeft: `3px solid ${act.color}`, background: 'var(--bg-card)' }}>
                      <span style={{ fontSize: '18px' }}>{act.icon}</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                        {act.action}{' '}
                        <span style={{ color: act.color, fontWeight: 700 }}>{act.value}</span>
                      </p>
                    </div>
                    <div className="flex gap-4 mt-2">
                      {['👏 Bravo!', '🔥 Top!', '💪 Forza!'].map(r => (
                        <button key={r} style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--text-sub)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{r}</button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* FRIENDS LIST */}
        {!loading && tab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontWeight: 700, color: 'var(--text)' }}>Nessun amico ancora</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Cerca qualcuno con cui allenarti!</p>
              </div>
            ) : (
              friends.map((f, i) => (
                <div key={f.uid} className="flex items-center gap-3"
                  style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <Avatar name={f.name ?? '?'} idx={i} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{f.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      {f.city || '—'} · Lv.{f.level} · 🔥{f.streak ?? 0}
                    </p>
                  </div>
                  <button className="font-display"
                    style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-sub)', padding: '6px 12px', fontSize: '0.85rem', letterSpacing: '0.06em', borderRadius: '3px', cursor: 'pointer' }}>
                    SFIDA
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* SEARCH */}
        {!loading && tab === 'search' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '12px' }}>
              CERCA PER EMAIL
            </p>
            <div className="flex gap-2 mb-3">
              <input type="email" placeholder="amico@email.com" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 14px', fontSize: '14px', borderRadius: '4px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                onFocus={e => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button onClick={handleSendRequest} disabled={sending || !searchEmail} className="font-display"
                style={{ background: sending || !searchEmail ? 'rgba(196,255,0,0.2)' : 'var(--lime)', color: '#000', padding: '12px 20px', fontSize: '1rem', borderRadius: '4px', border: 'none', cursor: sending || !searchEmail ? 'not-allowed' : 'pointer' }}>
                {sending ? '...' : 'INVIA'}
              </button>
            </div>
            {sendMsg && (
              <p style={{ fontSize: '12px', fontWeight: 600, color: sendMsg.startsWith('✅') ? 'var(--green)' : 'var(--orange)', marginBottom: '16px' }}>
                {sendMsg}
              </p>
            )}

            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', margin: '20px 0 12px' }}>
              SUGGERITI
            </p>
            {['Marco R.', 'Giulia M.', 'Luca T.', 'Sara B.'].map((name, i) => (
              <div key={name} className="flex items-center gap-3"
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <Avatar name={name} idx={i + 2} size={40} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>Lv.{i + 2} · {['Milano', 'Roma', 'Torino', 'Napoli'][i]}</p>
                </div>
                <button className="font-display"
                  style={{ background: 'transparent', border: '1px solid var(--lime)', color: 'var(--lime)', padding: '5px 12px', fontSize: '0.85rem', letterSpacing: '0.06em', borderRadius: '3px', cursor: 'pointer' }}>
                  + ADD
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  )
}
