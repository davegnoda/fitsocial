import { useState } from 'react'
import Layout from '../components/Layout'

const NEARBY = [
  { name: 'Marco R.', city: 'Milano', dist: '0.4 km', type: '🏃', level: 4, online: true },
  { name: 'Giulia M.', city: 'Milano', dist: '1.1 km', type: '🚴', level: 3, online: true },
  { name: 'Luca T.', city: 'Milano', dist: '1.8 km', type: '💪', level: 5, online: false },
  { name: 'Sara B.', city: 'Milano', dist: '2.3 km', type: '🏃', level: 2, online: false },
]

const EVENTS = [
  { title: 'Parkrun Milano', date: 'SAB 08:00', loc: 'Parco Sempione', participants: 47, type: '🏃' },
  { title: 'Bike Sunday', date: 'DOM 07:30', loc: 'Navigli', participants: 23, type: '🚴' },
  { title: 'HIIT al Parco', date: 'MER 18:00', loc: 'Parco Testaccio', participants: 15, type: '⚡' },
]

const ROUTES = [
  { name: 'Navigli Loop', dist: '7.2 km', elev: '+45m', runs: 312, type: '🏃' },
  { name: 'Duomo - Sempione', dist: '5.8 km', elev: '+12m', runs: 289, type: '🚴' },
  { name: 'Parco Nord Circuit', dist: '4.1 km', elev: '+8m', runs: 198, type: '🏃' },
]

export default function CommunityPage() {
  const [tab, setTab] = useState<'radar' | 'events' | 'routes'>('radar')
  const [liveMode, setLiveMode] = useState(false)

  const TABS = [
    { key: 'radar', label: 'RADAR' },
    { key: 'events', label: 'EVENTI' },
    { key: 'routes', label: 'PERCORSI' },
  ]

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '40px 20px 0', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.2em', marginBottom: '4px' }}>COMMUNITY</p>
        <h1 className="font-display" style={{ fontSize: '3.5rem', color: 'var(--text)', lineHeight: 0.9 }}>MAPPA</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '6px', marginBottom: '20px' }}>
          Trova atleti · Unisciti agli eventi · Esplora percorsi
        </p>
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="font-display"
              style={{
                padding: '10px 18px', fontSize: '1rem', letterSpacing: '0.08em',
                color: tab === t.key ? 'var(--teal)' : 'var(--text-sub)',
                borderBottom: tab === t.key ? '2px solid var(--teal)' : '2px solid transparent',
                background: 'transparent', transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>

        {/* RADAR */}
        {tab === 'radar' && (
          <div>
            {/* Live toggle */}
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em' }}>
                ATLETI VICINO A TE
              </span>
              <button onClick={() => setLiveMode(!liveMode)}
                className="flex items-center gap-2"
                style={{ background: liveMode ? 'rgba(0,212,177,0.1)' : 'var(--bg-card)', border: `1px solid ${liveMode ? 'var(--teal)' : 'var(--border-strong)'}`, color: liveMode ? 'var(--teal)' : 'var(--text-sub)', padding: '5px 12px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'Bebas Neue, sans-serif' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: liveMode ? 'var(--teal)' : 'var(--text-sub)', display: 'inline-block' }} />
                {liveMode ? 'LIVE' : 'OFFLINE'}
              </button>
            </div>

            {/* Radar visual */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', maxWidth: '280px', margin: '0 auto 20px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,177,0.04) 0%, transparent 70%)', border: '1px solid rgba(0,212,177,0.15)' }}>
              <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', border: '1px solid rgba(0,212,177,0.1)' }} />
              <div style={{ position: 'absolute', inset: '40%', borderRadius: '50%', border: '1px solid rgba(0,212,177,0.15)', background: 'rgba(0,212,177,0.03)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)' }} />
              </div>
              {/* Athlete dots */}
              {[{ top: '20%', left: '60%' }, { top: '55%', left: '75%' }, { top: '70%', left: '30%' }, { top: '35%', left: '25%' }].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', opacity: 0.8, ...pos,
                  boxShadow: '0 0 6px var(--teal)', animation: liveMode ? `pulse-lime 2s ${i * 0.4}s ease-in-out infinite` : 'none' }} />
              ))}
              {liveMode && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,212,177,0.15) 15%, transparent 30%)', animation: 'spin 3s linear infinite' }} />
              )}
            </div>

            {NEARBY.map((a, i) => (
              <div key={i} className="flex items-center gap-3"
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ fontSize: '24px' }}>{a.type}</span>
                  {a.online && <span style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{a.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{a.city} · Lv.{a.level}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)' }}>{a.dist}</span>
              </div>
            ))}
          </div>
        )}

        {/* EVENTS */}
        {tab === 'events' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '12px' }}>
              EVENTI LOCALI
            </p>
            {EVENTS.map((ev, i) => (
              <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '22px' }}>{ev.type}</span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{ev.title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                        📍 {ev.loc}
                      </p>
                    </div>
                  </div>
                  <span className="font-display" style={{ fontSize: '0.85rem', color: 'var(--amber)', letterSpacing: '0.06em', whiteSpace: 'nowrap', paddingLeft: '8px' }}>
                    {ev.date}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{ev.participants} partecipanti</span>
                  <button className="font-display"
                    style={{ background: 'transparent', border: '1px solid var(--teal)', color: 'var(--teal)', padding: '5px 14px', fontSize: '0.85rem', letterSpacing: '0.06em', borderRadius: '3px', cursor: 'pointer' }}>
                    UNISCITI
                  </button>
                </div>
              </div>
            ))}

            <button className="font-display w-full"
              style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--teal)', padding: '13px', fontSize: '1rem', letterSpacing: '0.06em', borderRadius: '4px', cursor: 'pointer' }}>
              + CREA EVENTO
            </button>
          </div>
        )}

        {/* ROUTES */}
        {tab === 'routes' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '12px' }}>
              PERCORSI POPOLARI
            </p>
            {ROUTES.map((r, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '22px' }}>{r.type}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{r.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      {r.dist} · {r.elev} · {r.runs} corse
                    </p>
                  </div>
                  <button className="font-display"
                    style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-sub)', padding: '5px 12px', fontSize: '0.85rem', letterSpacing: '0.06em', borderRadius: '3px', cursor: 'pointer' }}>
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  )
}
