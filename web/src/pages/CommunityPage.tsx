import { useState } from 'react'
import { useUser } from '../hooks/useUser'
import Layout from '../components/Layout'

const NEARBY_ATHLETES = [
  { name: 'Marco R.', distance: '0.3 km', activity: 'Correndo ora 🏃', color: '#30D158', level: 4 },
  { name: 'Giulia M.', distance: '0.8 km', activity: 'Ciclismo 🚴', color: '#5AC8FA', level: 3 },
  { name: 'Luca T.', distance: '1.2 km', activity: 'Palestra 💪', color: '#BF5AF2', level: 5 },
  { name: 'Sara B.', distance: '1.5 km', activity: 'Yoga 🧘', color: '#FF375F', level: 2 },
]

const LOCAL_EVENTS = [
  { title: 'Corsa del Parco', date: 'Domani · 18:00', participants: 12, icon: '🏃', color: '#30D158', type: 'Corsa' },
  { title: 'Ride cittadino', date: 'Sab · 09:00', participants: 8, icon: '🚴', color: '#5AC8FA', type: 'Bici' },
  { title: 'HIIT al Parco', date: 'Dom · 10:00', participants: 20, icon: '💪', color: '#FF9F0A', type: 'HIIT' },
]

const POPULAR_ROUTES = [
  { name: 'Percorso del Fiume', distance: '5.2 km', elevation: '+45m', runners: 234, color: '#0A84FF' },
  { name: 'Giro del Parco', distance: '3.4 km', elevation: '+12m', runners: 189, color: '#30D158' },
  { name: 'Lungomare Est', distance: '8.1 km', elevation: '+5m', runners: 156, color: '#5AC8FA' },
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #30D158, #5AC8FA)',
  'linear-gradient(135deg, #5AC8FA, #0A84FF)',
  'linear-gradient(135deg, #BF5AF2, #FF375F)',
  'linear-gradient(135deg, #FF375F, #FF9F0A)',
]

export default function CommunityPage() {
  const { profile } = useUser()
  const [liveMode, setLiveMode] = useState(false)
  const [tab, setTab] = useState<'radar' | 'events' | 'routes'>('radar')

  return (
    <Layout>
      {/* Header */}
      <div
        className="relative px-5 pt-12 pb-0 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #051A2E 0%, #0A1520 60%, #07070A 100%)', borderBottom: '1px solid #1C1C24' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(90,200,250,0.08) 0%, transparent 70%)' }} />

        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#5AC8FA' }}>Community</p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}>
          MAPPA
        </h1>
        <p className="text-sm mt-1 mb-4" style={{ color: '#8A8A96' }}>
          📍 {profile?.city || 'La tua città'} · {NEARBY_ATHLETES.length} atleti vicini
        </p>

        {/* Live toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLiveMode(!liveMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all"
            style={{
              background: liveMode ? 'linear-gradient(135deg, #30D158, #5AC8FA)' : 'rgba(48,209,88,0.1)',
              color: liveMode ? '#FFF' : '#30D158',
              border: liveMode ? 'none' : '1px solid rgba(48,209,88,0.3)',
              boxShadow: liveMode ? '0 4px 16px rgba(48,209,88,0.3)' : 'none',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: liveMode ? '#FFF' : '#30D158', display: 'inline-block', animation: liveMode ? 'pulse-fire 1s infinite' : 'none' }} />
            {liveMode ? 'LIVE — Visibile' : 'Attiva radar'}
          </button>
          {liveMode && <p className="text-xs" style={{ color: '#8A8A96' }}>Gli atleti vicini ti vedono</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 -mb-px">
          {[
            { key: 'radar', label: 'Radar', icon: '📡' },
            { key: 'events', label: 'Eventi', icon: '📅' },
            { key: 'routes', label: 'Percorsi', icon: '🗺️' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'radar' | 'events' | 'routes')}
              className="px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all"
              style={{
                background: tab === t.key ? '#141419' : 'transparent',
                color: tab === t.key ? '#F8F8FC' : '#8A8A96',
                borderBottom: tab === t.key ? '2px solid #5AC8FA' : '2px solid transparent',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* RADAR TAB */}
        {tab === 'radar' && (
          <div>
            {/* Map placeholder */}
            <div
              className="rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden"
              style={{ height: '200px', background: 'linear-gradient(135deg, #051A2E, #071520)', border: '1px solid #1C1C24' }}
            >
              {/* Radar rings */}
              {[1, 2, 3].map(r => (
                <div key={r} className="absolute rounded-full" style={{
                  width: r * 80, height: r * 80,
                  border: '1px solid rgba(90,200,250,0.15)',
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                }} />
              ))}
              {/* Center dot (you) */}
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#5AC8FA', boxShadow: '0 0 16px rgba(90,200,250,0.6)', position: 'absolute', zIndex: 2 }} />
              {/* Athlete dots */}
              {NEARBY_ATHLETES.map((a, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 10, height: 10, borderRadius: '50%',
                  background: a.color,
                  boxShadow: `0 0 12px ${a.color}80`,
                  left: `${35 + (i % 2) * 30}%`,
                  top: `${25 + Math.floor(i / 2) * 40}%`,
                  zIndex: 2,
                }} />
              ))}
              <p className="absolute bottom-3 right-3 text-xs font-bold" style={{ color: '#5AC8FA' }}>
                📡 Mappa live
              </p>
              <p className="absolute bottom-3 left-3 text-xs" style={{ color: '#8A8A96' }}>
                Disponibile su app mobile
              </p>
            </div>

            {/* Nearby athletes list */}
            <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Atleti vicini</p>
            <div className="space-y-2">
              {NEARBY_ATHLETES.map((a, i) => (
                <div
                  key={a.name}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: '#141419', border: '1px solid #1C1C24' }}
                >
                  <div
                    style={{ width: 44, height: 44, borderRadius: 12, background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed'", fontWeight: 700, color: '#FFF', flexShrink: 0 }}
                  >
                    {a.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: '#F8F8FC' }}>{a.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: a.color }}>{a.activity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#8A8A96' }}>{a.distance}</p>
                    <button className="mt-1 text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}>
                      Unisciti
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {tab === 'events' && (
          <div>
            <button
              className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.1), rgba(90,200,250,0.05))', border: '1px dashed rgba(48,209,88,0.3)', color: '#30D158' }}
            >
              <span className="text-xl">＋</span> Crea nuovo evento
            </button>

            <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Eventi vicino a te</p>
            <div className="space-y-3">
              {LOCAL_EVENTS.map((e) => (
                <div
                  key={e.title}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: '#141419', border: '1px solid #1C1C24' }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none" style={{ background: `radial-gradient(circle, ${e.color}15 0%, transparent 70%)` }} />
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${e.color}15`, border: `1px solid ${e.color}30` }}>
                      {e.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: '#F8F8FC' }}>{e.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#8A8A96' }}>📅 {e.date}</p>
                      <p className="text-xs mt-0.5" style={{ color: e.color }}>{e.participants} partecipanti</p>
                    </div>
                    <button className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${e.color}15`, color: e.color, border: `1px solid ${e.color}30` }}>
                      Partecipa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROUTES TAB */}
        {tab === 'routes' && (
          <div>
            <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Percorsi popolari</p>
            <div className="space-y-3">
              {POPULAR_ROUTES.map((r) => (
                <div
                  key={r.name}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: '#141419', border: '1px solid #1C1C24' }}
                >
                  <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none" style={{ background: `radial-gradient(circle, ${r.color}10 0%, transparent 70%)` }} />
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${r.color}12`, border: `1px solid ${r.color}25` }}>
                      🗺️
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: '#F8F8FC' }}>{r.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold" style={{ color: r.color }}>{r.distance}</span>
                        <span className="text-xs" style={{ color: '#8A8A96' }}>{r.elevation}</span>
                        <span className="text-xs" style={{ color: '#8A8A96' }}>👟 {r.runners}</span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${r.color}12`, color: r.color, border: `1px solid ${r.color}25` }}>
                      Inizia
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="w-full rounded-2xl p-4 mt-3 flex items-center gap-3 font-bold text-sm"
              style={{ background: 'rgba(10,132,255,0.06)', border: '1px dashed rgba(10,132,255,0.3)', color: '#0A84FF' }}
            >
              <span className="text-xl">📍</span> Crea nuovo percorso
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
