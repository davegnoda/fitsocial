import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { updateUserProfile } from '../services/userService'
import EditProfileModal from '../components/EditProfileModal'
import Layout from '../components/Layout'
import type { UserProfile } from '../types'

const LEVEL_TITLES = ['', 'Rookie', 'Runner', 'Atleta', 'Campione', 'Leggenda']

export default function ProfilePage() {
  const { logout } = useAuth()
  const { profile, refetch } = useUser()
  const [showEdit, setShowEdit] = useState(false)

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpToNext = level * 1000
  const xpPct = Math.min((xp % xpToNext) / xpToNext * 100, 100)
  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  const handleSaveProfile = async (data: Partial<UserProfile>) => {
    if (!profile) return
    await updateUserProfile(profile.uid, data)
    refetch()
  }

  const menuItems = [
    { icon: '⌚', label: 'Connetti smartwatch', sub: 'Apple Watch · Garmin · Samsung', accent: 'var(--blue)' },
    { icon: '🏅', label: 'Fitness Passport', sub: 'I tuoi traguardi verificati', accent: 'var(--amber)' },
    { icon: '⚙️', label: 'Impostazioni account', sub: 'Nome · città · livello fitness', accent: 'var(--text-sub)', action: () => setShowEdit(true) },
    { icon: '🔒', label: 'Privacy e GDPR', sub: 'Gestisci i tuoi dati', accent: 'var(--text-sub)' },
  ]

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '40px 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="font-display flex items-center justify-center"
              style={{ width: 64, height: 64, background: 'var(--lime)', color: '#000', fontSize: '1.8rem', borderRadius: '4px', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1, letterSpacing: '0.02em' }}>
                {(profile?.name ?? 'ATLETA').toUpperCase()}
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
                {profile?.city && `📍 ${profile.city}  ·  `}
                <span style={{ color: profile?.plan === 'premium' ? 'var(--amber)' : 'var(--text-sub)' }}>
                  {profile?.plan === 'premium' ? '⭐ Premium' : 'Free'}
                </span>
              </p>
            </div>
          </div>
          <button onClick={() => setShowEdit(true)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-sub)', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Modifica
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
          {[
            { label: 'LIVELLO', value: level, color: 'var(--lime)', sub: LEVEL_TITLES[Math.min(level, 5)] },
            { label: 'XP', value: xp.toLocaleString(), color: 'var(--purple)', sub: 'punti totali' },
            { label: 'STREAK', value: profile?.streak ?? 0, color: 'var(--orange)', sub: 'giorni 🔥' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', padding: '14px 10px', textAlign: 'center' }}>
              <span className="font-display" style={{ fontSize: '2rem', color: s.color, display: 'block', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-sub)', display: 'block', marginTop: '3px' }}>{s.sub}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: 700, letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: 600, letterSpacing: '0.1em' }}>XP VERSO LIVELLO {level + 1}</span>
            <span style={{ fontSize: '10px', color: 'var(--purple)', fontWeight: 700 }}>{Math.round(xpPct)}%</span>
          </div>
          <div style={{ height: '2px', background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${xpPct}%`, height: '100%', background: 'var(--purple)', transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item, i) => (
          <button key={i} onClick={item.action}
            className="flex items-center gap-4 w-full text-left"
            style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: item.action ? 'pointer' : 'default' }}>
            <span style={{ fontSize: '20px', width: '28px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{item.label}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>{item.sub}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.42z"/>
            </svg>
          </button>
        ))}

        {/* Logout */}
        <button onClick={logout}
          className="flex items-center gap-4 w-full text-left"
          style={{ padding: '16px 0', marginTop: '8px', background: 'transparent', cursor: 'pointer' }}>
          <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>🚪</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--orange)' }}>Esci dall'account</span>
        </button>
      </div>

      {showEdit && profile && (
        <EditProfileModal profile={profile} onSave={handleSaveProfile} onClose={() => setShowEdit(false)} />
      )}
    </Layout>
  )
}
