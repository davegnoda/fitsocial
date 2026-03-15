import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import Layout from '../components/Layout'

const LEVEL_TITLES = ['', 'Rookie', 'Runner', 'Atleta', 'Campione', 'Leggenda']

export default function ProfilePage() {
  const { logout } = useAuth()
  const { profile } = useUser()

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpToNext = level * 1000
  const xpPercent = Math.min((xp % xpToNext) / xpToNext * 100, 100)
  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  const menuItems = [
    { icon: '⌚', label: 'Connetti smartwatch', sub: 'Apple Watch, Garmin, Samsung', color: '#3D9EFF' },
    { icon: '🏅', label: 'Fitness Passport', sub: 'I tuoi traguardi verificati', color: '#B8FF00' },
    { icon: '⚙️', label: 'Impostazioni account', sub: 'Email, password, notifiche', color: '#8A8A96' },
    { icon: '🔒', label: 'Privacy e GDPR', sub: 'Gestisci i tuoi dati', color: '#8A8A96' },
  ]

  return (
    <Layout>
      {/* Profile Header */}
      <div
        className="relative px-5 pt-12 pb-8 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0F0F14 0%, #07070A 100%)', borderBottom: '1px solid #1C1C24' }}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(155,91,255,0.08) 0%, transparent 70%)' }} />

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div
            className="rounded-2xl flex items-center justify-center text-2xl font-black"
            style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(255,69,0,0.3), rgba(155,91,255,0.3))',
              border: '2px solid rgba(255,69,0,0.4)',
              color: '#F8F8FC',
              fontFamily: "'Barlow Condensed', sans-serif",
              boxShadow: '0 0 30px rgba(255,69,0,0.2)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <h1
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', fontWeight: 800, color: '#F8F8FC', lineHeight: 1 }}
            >
              {(profile?.name ?? 'ATLETA').toUpperCase()}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8A8A96' }}>
              {profile?.city && `📍 ${profile.city} · `}
              <span style={{ color: profile?.plan === 'premium' ? '#FFB800' : '#8A8A96' }}>
                {profile?.plan === 'premium' ? '⭐ Premium' : 'Free'}
              </span>
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'LIVELLO', value: level, color: '#B8FF00', sub: LEVEL_TITLES[Math.min(level, 5)] },
            { label: 'XP TOTALE', value: xp.toLocaleString(), color: '#9B5BFF', sub: 'punti' },
            { label: 'STREAK', value: `${profile?.streak ?? 0}`, color: '#FF4500', sub: 'giorni 🔥' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1C1C24' }}
            >
              <p
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}
              >
                {s.value}
              </p>
              <p className="text-xs mt-1" style={{ color: '#8A8A96' }}>{s.sub}</p>
              <p className="text-xs font-bold mt-0.5 uppercase tracking-wider" style={{ color: '#3A3A44' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: '#8A8A96' }}>Prossimo livello</span>
            <span className="text-xs font-bold" style={{ color: '#B8FF00' }}>{Math.round(xpPercent)}%</span>
          </div>
          <div className="rounded-full" style={{ height: '4px', background: '#1C1C24' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, #B8FF00, #9B5BFF)', boxShadow: '0 0 10px rgba(184,255,0,0.3)' }}
            />
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 pt-5 space-y-2">
        {menuItems.map((item, i) => (
          <button
            key={i}
            className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all hover:opacity-80"
            style={{ background: '#141419', border: '1px solid #1C1C24' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${item.color}12`, border: `1px solid ${item.color}30` }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#F8F8FC' }}>{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#8A8A96' }}>{item.sub}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3A3A44">
              <path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.42z"/>
            </svg>
          </button>
        ))}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full rounded-2xl p-4 flex items-center gap-4 text-left mt-4 transition-all hover:opacity-80"
          style={{ background: 'rgba(255,69,0,0.05)', border: '1px solid rgba(255,69,0,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(255,69,0,0.1)' }}>
            🚪
          </div>
          <p className="text-sm font-bold" style={{ color: '#FF4500' }}>Esci dall'account</p>
        </button>
      </div>
    </Layout>
  )
}
