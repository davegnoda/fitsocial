import { useEffect, useState, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getTodayActivity, saveActivity, getWeeklyActivities } from '../services/activityService'
import { getFeed } from '../services/feedService'
import type { FeedEntry } from '../types'
import { getUnreadCount, getNotifications } from '../services/notificationService'
// ActivityCard moved to Control Center (StatsPage)
import LogWorkoutModal from '../components/LogWorkoutModal'
import NotificationsPanel from '../components/NotificationsPanel'
import Layout from '../components/Layout'
import type { Activity, WeeklyLeague } from '../types'
import { getCurrentLeague, getUserTier } from '../services/leagueService'

const DAYS_IT = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']

const CATEGORY_PILLS = ['Tutti', 'Corsa 🏃', 'Crossfit 💪', 'Yoga 🧘', 'Ciclismo 🚴']
const CATEGORY_TYPES: Record<string, string[]> = {
  'Tutti': [],
  'Corsa 🏃': ['running', 'walking'],
  'Crossfit 💪': ['gym', 'hiit'],
  'Yoga 🧘': ['other'],
  'Ciclismo 🚴': ['cycling'],
}

function WeekChart({ todayScore, weekSteps }: { todayScore: number; weekSteps: Map<string, number> }) {
  const today = new Date().getDay()
  const todayIdx = today === 0 ? 6 : today - 1
  const now = Date.now()
  const bars = DAYS_IT.map((d, i) => {
    const dayOffset = i - todayIdx
    const date = new Date(now + dayOffset * 86_400_000).toISOString().slice(0, 10)
    if (i === todayIdx) return { day: d, score: todayScore, isToday: true }
    if (i > todayIdx) return { day: d, score: 0, isToday: false }
    const steps = weekSteps.get(date) ?? 0
    return { day: d, score: Math.min(100, Math.round((steps / 10000) * 100)), isToday: false }
  })
  return (
    <div className="flex items-end justify-between" style={{ gap: '4px', height: '48px', marginBottom: '6px' }}>
      {bars.map((b, i) => {
        const h = Math.max(6, Math.round(b.score * 0.44))
        return (
          <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
            <div style={{
              width: '100%', height: `${h}px`,
              background: b.isToday ? 'rgba(255,255,255,0.9)' : b.score === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
              borderRadius: '4px 4px 0 0',
            }} />
            <span style={{ fontSize: '8px', fontWeight: b.isToday ? 700 : 500, color: b.isToday ? 'white' : 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>{b.day}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile, refetch: refresh } = useUser()
  const { state } = useLocation()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tutti')
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [weekSteps, setWeekSteps] = useState<Map<string, number>>(new Map())
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [onlineUsers, setOnlineUsers] = useState<FeedEntry[]>([])
  const [badgeToast, setBadgeToast] = useState<{ icon: string; title: string } | null>(null)
  const pillsRef = useRef<HTMLDivElement>(null)
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
  const scrollPills = (dir: 'left' | 'right') =>
    pillsRef.current?.scrollBy({ left: dir === 'right' ? 140 : -140, behavior: 'smooth' })
  const [streakToast, setStreakToast] = useState(false)
  const [prToast, setPrToast] = useState<string | null>(null)
  const [deloadDismissed, setDeloadDismissed] = useState(() => localStorage.getItem('deload_ok') === new Date().toISOString().slice(0, 7))
  const [league, setLeague] = useState<WeeklyLeague | null>(null)
  const [userTier, setUserTier] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getTodayActivity(user.uid).then(setActivity).catch(() => {})
    getWeeklyActivities(user.uid).then(acts => {
      const m = new Map<string, number>()
      acts.forEach(a => m.set(a.date, a.steps))
      setWeekSteps(m)
      setRecentActivities(acts)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (user) getUnreadCount(user.uid).then(setUnreadCount).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    getCurrentLeague().then(l => {
      if (l) {
        setLeague(l)
        setUserTier(getUserTier(l, user.uid))
      }
    }).catch(() => {})
  }, [user])

  // Load active users from feed (with timeout so it never hangs) + auto-refresh
  useEffect(() => {
    if (!user) return
    const fetchOnline = () => {
      const timeout = new Promise<FeedEntry[]>(r => setTimeout(() => r([]), 2500))
      Promise.race([getFeed(12), timeout])
        .then(data => {
          const seen = new Set<string>()
          const unique = data.filter(e => {
            if (seen.has(e.userId)) return false
            seen.add(e.userId)
            return e.userId !== user.uid
          })
          setOnlineUsers(unique.slice(0, 8))
        })
        .catch(() => {})
    }
    fetchOnline()
    const interval = setInterval(fetchOnline, 60_000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (state?.openLog) {
      setShowModal(true)
      window.history.replaceState({}, '')
    }
  }, [state])

  // Listen for server-side notifications to show toasts (badges, PRs, streaks)
  useEffect(() => {
    if (!user) return
    const check = async () => {
      try {
        const notifs = await getNotifications(user.uid)
        const recent = notifs.filter(n => !n.read && Date.now() - n.createdAt < 10000)
        for (const n of recent) {
          if (n.type === 'achievement') {
            setBadgeToast({ icon: '🏅', title: n.body })
            setTimeout(() => setBadgeToast(null), 4000)
          } else if (n.body?.includes('Record')) {
            setPrToast(n.body)
            setTimeout(() => setPrToast(null), 4000)
          } else if (n.body?.includes('livello')) {
            setStreakToast(true)
            setTimeout(() => setStreakToast(false), 4000)
          }
        }
      } catch {}
    }
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [user])

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const steps = activity?.steps ?? 0
  const calories = activity?.calories ?? 0
  const distance = activity?.distance ?? 0
  const stepsPct = Math.min(100, Math.round((steps / 10000) * 100))

  const showDeload = (profile?.streak ?? 0) >= 18 && !deloadDismissed

  const coachMsg = steps >= 8000
    ? `Fantastico! Hai già ${steps.toLocaleString('it-IT')} passi oggi. Sei al ${stepsPct}% dell'obiettivo!`
    : steps >= 4000
    ? `Buon progresso! ${steps.toLocaleString('it-IT')} passi finora. Una camminata di 20 min ti porterà più vicino al goal.`
    : `Inizia la giornata! Sei a ${steps.toLocaleString('it-IT')} passi. Un allenamento rapido ti darà la spinta.`

  const handleSaveActivity = async (a: Activity) => {
    if (!user) return
    setActivity(a)
    await saveActivity(user.uid, a)
    refresh()
  }

  // Stats moved to Control Center page

  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <Layout>
      {/* APP HEADER */}
      <div className="flex items-center justify-between animate-fade" style={{ padding: '52px 20px 16px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--indigo)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}>FitSocial</h1>
          {profile?.city && (
            <p style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 500, marginTop: '1px' }}>📍 {profile.city}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Bell button */}
          <button onClick={() => setShowNotifications(true)} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: 'var(--shadow-card)',
            position: 'relative',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-sub)">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#EF4444', color: 'white',
                fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-card)',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {/* Avatar initials */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', fontFamily: "'Sora', sans-serif" }}>
              {initials}
            </span>
          </div>
        </div>
      </div>

      {/* HERO STEPS CARD */}
      <div className="animate-up" style={{ padding: '0 20px 20px' }}>
        <div style={{
          background: 'var(--gradient-hero)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(79,70,229,0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '60px',
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          {/* Diagonal gradient strip for personality */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: '40%',
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.03) 100%)',
            pointerEvents: 'none',
          }} />

          <div className="flex items-start justify-between" style={{ position: 'relative' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Passi Oggi
              </p>
              <div className="flex items-end gap-2">
                <span className="font-display animate-count" style={{ fontSize: '3.2rem', color: 'white', lineHeight: 1 }}>
                  {steps.toLocaleString('it-IT')}
                </span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', paddingBottom: '6px' }}>/ 10k</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  LV.<span style={{ color: 'white', fontWeight: 700 }}>{level}</span>
                  {'  '}·{'  '}
                  <span style={{ color: 'white', fontWeight: 700 }}>{xp.toLocaleString()}</span> XP
                </span>
              </div>
            </div>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)',
            }}>
              <span style={{ fontSize: '24px' }}>👟</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '20px', position: 'relative' }}>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="animate-fill" style={{ width: `${stepsPct}%`, height: '100%', background: 'white', borderRadius: '3px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{stepsPct}% obiettivo</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>🔥 {profile?.streak ?? 0} streak</span>
            </div>
          </div>

          {/* Week chart */}
          <div style={{ marginTop: '18px' }}>
            <WeekChart todayScore={stepsPct} weekSteps={weekSteps} />
          </div>
        </div>
      </div>

      {/* DELOAD BANNER */}
      {showDeload && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '20px' }}>💤</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', lineHeight: 1.2 }}>
                Settimana di recupero consigliata
              </p>
              <p style={{ fontSize: '11px', color: '#B45309', marginTop: '3px', lineHeight: 1.4 }}>
                Sono {profile?.streak} giorni che ti alleni senza sosta. Un giorno leggero questa settimana ti farà progredire più velocemente.
              </p>
            </div>
            <button onClick={() => {
              localStorage.setItem('deload_ok', new Date().toISOString().slice(0, 7))
              setDeloadDismissed(true)
            }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#B45309', flexShrink: 0, lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY PILLS — arrow carousel, no scrollbar */}
      <div style={{ position: 'relative', padding: '0 20px 20px' }}>
        {/* Left fade + arrow */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: '20px', width: '52px', zIndex: 2, display: 'flex', alignItems: 'center', paddingLeft: '4px', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, var(--bg) 40%, transparent)' }} />
          <button onClick={() => scrollPills('left')} style={{
            position: 'relative', zIndex: 1, width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(15,15,20,0.85)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'all', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><path d="M7 1L3 5l4 4"/></svg>
          </button>
        </div>
        {/* Scrollable pills */}
        <div ref={pillsRef} style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingLeft: '36px', paddingRight: '36px' }}>
          {CATEGORY_PILLS.map(pill => {
            const isActive = activeCategory === pill
            return (
              <button key={pill} onClick={() => setActiveCategory(pill)} style={{
                flexShrink: 0, padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                background: isActive ? 'var(--gradient)' : 'var(--bg-card)',
                color: isActive ? 'white' : 'var(--text-sub)',
                fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.01em',
                boxShadow: isActive ? '0 4px 12px rgba(79,70,229,0.25)' : 'var(--shadow-card)',
                border: isActive ? 'none' : '1px solid var(--border)',
                transition: 'all 0.2s',
              }}>
                {isActive ? `${pill} ✓` : pill}
              </button>
            )
          })}
        </div>
        {/* Right fade + arrow */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: '20px', width: '52px', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, var(--bg) 40%, transparent)' }} />
          <button onClick={() => scrollPills('right')} style={{
            position: 'relative', zIndex: 1, width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(15,15,20,0.85)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'all', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8"><path d="M3 1l4 4-4 4"/></svg>
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY — compact row linking to Control Center */}
      <div style={{ padding: '0 20px 20px' }}>
        <Link to="/stats" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { icon: '🔥', val: calories, unit: 'kcal' },
                { icon: '📍', val: distance.toFixed(1), unit: 'km' },
                { icon: '❤️', val: activity?.heartRate ?? '—', unit: 'bpm' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px' }}>{s.icon}</span>
                  <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", lineHeight: 1, marginTop: '2px' }}>{s.val}</p>
                  <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 600, letterSpacing: '0.04em' }}>{s.unit}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 700 }}>Control Center</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--indigo)"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </div>
          </div>
        </Link>
      </div>

      {/* POST-WORKOUT SUMMARY */}
      {activity?.workouts && activity.workouts.length > 0 && (() => {
        const todayWorkouts = activity.workouts
        const totalDur = todayWorkouts.reduce((s, w) => s + w.duration, 0)
        const totalVol = todayWorkouts.reduce((s, w) =>
          s + (w.exercises ?? []).reduce((ss, ex) =>
            ss + ex.sets.reduce((sss, set) => sss + set.kg * set.reps, 0), 0), 0)
        const warmUp = todayWorkouts.reduce((s, w) => s + (w.warmUpMins ?? 0), 0)
        const coolDown = todayWorkouts.reduce((s, w) => s + (w.coolDownMins ?? 0), 0)
        const muscleMap: Record<string, string[]> = {
          running: ['Gambe', 'Cardio'], cycling: ['Gambe', 'Cardio'], walking: ['Gambe'],
          hiit: ['Full Body', 'Cardio'], gym: [], other: ['Core'],
        }
        const muscles = new Set<string>()
        todayWorkouts.forEach(w => {
          (muscleMap[w.type] ?? []).forEach(m => muscles.add(m))
          ;(w.exercises ?? []).forEach(ex => {
            const name = ex.name.toLowerCase()
            if (name.includes('squat') || name.includes('leg') || name.includes('affond') || name.includes('stacco') || name.includes('hip') || name.includes('calf')) muscles.add('Gambe')
            if (name.includes('panca') || name.includes('push') || name.includes('croci') || name.includes('dips')) muscles.add('Petto')
            if (name.includes('traz') || name.includes('remat') || name.includes('lat') || name.includes('pulley')) muscles.add('Schiena')
            if (name.includes('military') || name.includes('alzat') || name.includes('face') || name.includes('arnold')) muscles.add('Spalle')
            if (name.includes('curl') || name.includes('tricip') || name.includes('french')) muscles.add('Braccia')
            if (name.includes('plank') || name.includes('crunch') || name.includes('russian') || name.includes('leg raise') || name.includes('ab ')) muscles.add('Core')
          })
        })
        const rpe = activity.rpe
        const recoveryTip = rpe && rpe >= 8 ? 'Allenamento intenso! Riposa 48h prima di allenare gli stessi muscoli.'
          : rpe && rpe >= 6 ? 'Buona sessione. 24-36h di recupero consigliati.'
          : totalDur >= 60 ? 'Sessione lunga — assicurati di idratarti e fare stretching.'
          : 'Ottimo lavoro! Mantieni la costanza.'

        return (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), var(--bg-card))',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)', padding: '16px', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📋</span>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>Riepilogo di oggi</p>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '10px', padding: '10px 4px' }}>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--indigo)', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{totalDur}</p>
                  <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '2px' }}>MIN</p>
                </div>
                {totalVol > 0 && (
                  <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '10px', padding: '10px 4px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: '#7C3AED', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
                      {totalVol >= 1000 ? `${(totalVol / 1000).toFixed(1)}t` : `${totalVol}kg`}
                    </p>
                    <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '2px' }}>VOLUME</p>
                  </div>
                )}
                {rpe && (
                  <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '10px', padding: '10px 4px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: rpe >= 8 ? '#EF4444' : rpe >= 6 ? '#F59E0B' : '#22C55E', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{rpe}</p>
                    <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '2px' }}>RPE</p>
                  </div>
                )}
                {(warmUp > 0 || coolDown > 0) && (
                  <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '10px', padding: '10px 4px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0EA5E9', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
                      {warmUp > 0 ? `${warmUp}` : '—'}/{coolDown > 0 ? `${coolDown}` : '—'}
                    </p>
                    <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '2px' }}>RISC/DEF</p>
                  </div>
                )}
              </div>

              {/* Muscles hit */}
              {muscles.size > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', marginBottom: '6px' }}>MUSCOLI COINVOLTI</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {[...muscles].map(m => (
                      <span key={m} style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                        background: 'var(--indigo-light)', color: 'var(--indigo)',
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery tip */}
              <div style={{
                background: 'rgba(34,197,94,0.08)', borderRadius: '8px',
                padding: '8px 12px', border: '1px solid rgba(34,197,94,0.15)',
              }}>
                <p style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, lineHeight: 1.4 }}>
                  💚 {recoveryTip}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* WORKOUTS */}
      {activity?.workouts && activity.workouts.length > 0 && (() => {
        const allowedTypes = CATEGORY_TYPES[activeCategory]
        const filtered = allowedTypes.length === 0 ? activity.workouts : activity.workouts.filter(w => allowedTypes.includes(w.type))
        return (
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Allenamenti
          </p>
          {filtered.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', fontFamily: "'DM Sans', sans-serif" }}>
              Nessun allenamento di tipo "{activeCategory.replace(/\s\S+$/, '')}" oggi. <span style={{ color: 'var(--indigo)', cursor: 'pointer' }} onClick={() => setShowModal(true)}>Registra ora →</span>
            </p>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((w, i) => (
              <div key={i} className="flex items-center gap-3"
                style={{
                  background: 'var(--bg-card)', padding: '12px 14px',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border)',
                }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--indigo-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>
                  {w.type === 'running' ? '🏃' : w.type === 'cycling' ? '🚴' : w.type === 'gym' ? '💪' : w.type === 'hiit' ? '⚡' : '🚶'}
                </div>
                <div style={{ flex: 1 }}>
                  <span className="font-display" style={{ fontSize: '1rem', color: 'var(--text)' }}>{w.type.toUpperCase()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    {w.duration}m{w.distance ? ` · ${w.distance}km` : ''}
                  </span>
                </div>
                {w.verified && <span style={{ fontSize: '10px', color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>✓</span>}
              </div>
            ))}
          </div>
          )}
        </div>
        )
      })()}

      {/* RECENT HISTORY */}
      {(() => {
        const allowedTypes = CATEGORY_TYPES[activeCategory]
        const today = new Date().toISOString().slice(0, 10)
        const pastActs = recentActivities
          .filter(a => a.date !== today)
          .map(a => ({
            ...a,
            workouts: allowedTypes.length === 0 ? a.workouts : (a.workouts ?? []).filter(w => allowedTypes.includes(w.type))
          }))
          .filter(a => allowedTypes.length === 0 || a.workouts.length > 0)
        if (pastActs.length === 0) return null
        return (
        <div style={{ padding: '0 20px 20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Ultimi allenamenti
            </p>
            <Link to="/stats" style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Statistiche →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {pastActs
              .slice(0, 3)
              .map(a => {
                const d = new Date(a.date)
                const diffDays = Math.round((Date.now() - d.getTime()) / 86_400_000)
                const dateLabel = diffDays === 1 ? 'Ieri' : diffDays === 2 ? '2 giorni fa' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
                const emojiMap: Record<string, string> = { running: '🏃', cycling: '🚴', gym: '💪', hiit: '⚡', walking: '🚶', other: '🏋️' }
                return (
                  <div key={a.date} style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-sub)', minWidth: '64px', fontWeight: 600 }}>{dateLabel}</span>
                    <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                      {(a.workouts ?? []).slice(0, 3).map((w, i) => (
                        <span key={i} style={{ fontSize: '15px' }}>{emojiMap[w.type] ?? '🏋️'}</span>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {a.steps.toLocaleString('it-IT')} 👟
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
        )
      })()}

      {/* ══ LEGA SETTIMANALE ══ */}
      <div style={{ padding: '0 20px 20px' }}>
        {(() => {
          const tierGradients: Record<string, string> = {
            bronze: 'linear-gradient(135deg, #CD7F32, #8B4513)',
            silver: 'linear-gradient(135deg, #C0C0C0, #808080)',
            gold: 'linear-gradient(135deg, #FFD700, #FFA500)',
            diamond: 'linear-gradient(135deg, #B9F2FF, #4FC3F7)',
          }
          const tierNames: Record<string, string> = {
            bronze: 'BRONZE',
            silver: 'SILVER',
            gold: 'GOLD',
            diamond: 'DIAMOND',
          }
          const borderGrad = userTier ? tierGradients[userTier] ?? tierGradients.bronze : tierGradients.bronze

          if (!league) {
            return (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg, 16px)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                padding: '16px',
                textAlign: 'center',
                animation: 'slide-up 0.3s ease',
              }}>
                <span style={{ fontSize: '20px' }}>🏆</span>
                <p style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)',
                  letterSpacing: '0.08em', marginTop: '6px',
                  fontFamily: "'DM Sans', sans-serif",
                }}>LEGA SETTIMANALE</p>
                <p style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)',
                  fontFamily: "'DM Sans', sans-serif", marginTop: '6px',
                }}>Le leghe iniziano lunedì!</p>
              </div>
            )
          }

          return (
            <div style={{
              background: borderGrad,
              borderRadius: 'var(--radius-lg, 16px)',
              padding: '2px',
              animation: 'slide-up 0.3s ease',
            }}>
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'calc(var(--radius-lg, 16px) - 2px)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}>
                <span style={{ fontSize: '28px' }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)',
                    letterSpacing: '0.1em',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>LEGA SETTIMANALE</p>
                  <p style={{
                    fontSize: '20px', fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                    color: 'var(--text)',
                    lineHeight: 1.2,
                    marginTop: '2px',
                    letterSpacing: '-0.01em',
                  }}>{userTier ? tierNames[userTier] ?? userTier.toUpperCase() : 'UNRANKED'}</p>
                  <p style={{
                    fontSize: '10px', fontWeight: 500, color: 'var(--text-sub)',
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: '2px',
                  }}>Top 3 salgono, ultimi 3 scendono</p>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ══ ATTIVI ORA ══ */}
      {(() => {
        const DEMO_ONLINE: FeedEntry[] = [
          { id: 'd1', userId: 'u1', userName: 'Luca M.', date: new Date().toISOString().slice(0,10), workoutTypes: ['running'], steps: 8423, calories: 420, distance: 6.2, duration: 38, reactions: {}, createdAt: Date.now() - 900000 },
          { id: 'd2', userId: 'u2', userName: 'Sara T.', date: new Date().toISOString().slice(0,10), workoutTypes: ['gym'], steps: 4120, calories: 310, distance: 0, duration: 55, reactions: {}, createdAt: Date.now() - 1800000 },
          { id: 'd3', userId: 'u3', userName: 'Marco B.', date: new Date().toISOString().slice(0,10), workoutTypes: ['cycling'], steps: 2340, calories: 580, distance: 22.1, duration: 70, reactions: {}, createdAt: Date.now() - 3600000 },
          { id: 'd4', userId: 'u4', userName: 'Giulia R.', date: new Date().toISOString().slice(0,10), workoutTypes: ['hiit'], steps: 5600, calories: 450, distance: 0, duration: 30, reactions: {}, createdAt: Date.now() - 5400000 },
          { id: 'd5', userId: 'u5', userName: 'Alex D.', date: new Date().toISOString().slice(0,10), workoutTypes: ['running'], steps: 11200, calories: 620, distance: 8.8, duration: 52, reactions: {}, createdAt: Date.now() - 7200000 },
        ]
        const displayed = onlineUsers.length > 0 ? onlineUsers : DEMO_ONLINE
        const SPORT_EMOJI: Record<string, string> = { running: '🏃', gym: '💪', cycling: '🚴', hiit: '⚡', walking: '🚶', other: '🏋️' }
        const timeAgo = (ts: number) => {
          const m = Math.floor((Date.now() - ts) / 60000)
          if (m < 60) return `${m}m fa`
          return `${Math.floor(m / 60)}h fa`
        }
        const RING_COLORS = ['#4F46E5','#0D9488','#EA580C','#DB2777','#6D28D9','#059669','#2563EB','#7C3AED']
        const ringCol = (uid: string) => RING_COLORS[uid.charCodeAt(0) % RING_COLORS.length]
        return (
          <div style={{ padding: '0 20px 20px' }}>
            {/* Header row */}
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <div className="flex items-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 6px #22C55E' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Attivi Ora · {displayed.length}
                </p>
              </div>
              <Link to="/community" style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Vedi tutti →</Link>
            </div>

            {/* Card */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}>
              {displayed.map((u, i) => {
                const sportEmoji = SPORT_EMOJI[u.workoutTypes?.[0]] ?? '🏋️'
                const col = ringCol(u.userId)
                const isLast = i === displayed.length - 1
                return (
                  <Link key={u.userId} to={`/user/${u.userId}`} style={{ textDecoration: 'none' }}>
                    <div className="flex items-center gap-3" style={{
                      padding: '10px 14px',
                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Avatar with green dot */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: col,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: 'white',
                          fontFamily: "'Sora', sans-serif",
                        }}>
                          {u.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: '50%',
                          background: '#22C55E', border: '2px solid var(--bg-card)',
                        }} />
                      </div>
                      {/* Name + activity */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{u.userName}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                          {sportEmoji} {u.workoutTypes?.[0] ?? 'allenamento'} · {timeAgo(u.createdAt)}
                        </p>
                      </div>
                      {/* Steps + star */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{u.steps >= 1000 ? `${(u.steps/1000).toFixed(1)}k` : u.steps}</p>
                          <p style={{ fontSize: '9px', color: 'var(--text-sub)', letterSpacing: '0.05em' }}>PASSI</p>
                        </div>
                        <button onClick={(e) => toggleFav(u.userId, e)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '18px', padding: '2px', lineHeight: 1,
                          opacity: favorites.has(u.userId) ? 1 : 0.35,
                          transition: 'opacity 0.15s, transform 0.15s',
                          transform: favorites.has(u.userId) ? 'scale(1.1)' : 'scale(1)',
                        }}>
                          {favorites.has(u.userId) ? '⭐' : '☆'}
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* AI COACH — PROGRAMMI */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '16px' }}>🤖</span>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Coach
            </p>
          </div>
        </div>
        {/* Coach tip */}
        <div style={{
          background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
          borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '12px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize: '13px', color: 'white', lineHeight: 1.4, position: 'relative' }}>
            {coachMsg}
          </p>
        </div>
        {/* Programs carousel */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
          {[
            { emoji: '🌱', title: 'Fondamenta', subtitle: 'Full Body · 45min', color: '#16A34A', bg: 'rgba(22,163,74,0.08)',
              exercises: ['Squat', 'Panca Piana', 'Rematore con Bilanciere', 'Military Press', 'Plank'] },
            { emoji: '💪', title: 'Forza Base', subtitle: 'Upper · 50min', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',
              exercises: ['Panca Piana', 'Trazioni', 'Military Press', 'Curl Bicipiti', 'Tricipiti Cavo'] },
            { emoji: '🦵', title: 'Leg Day', subtitle: 'Lower · 50min', color: '#2563EB', bg: 'rgba(37,99,235,0.08)',
              exercises: ['Squat', 'Stacco da Terra', 'Leg Press', 'Affondi', 'Calf Raise'] },
            { emoji: '🏃', title: 'Corri 5K', subtitle: 'Cardio · 35min', color: '#0D9488', bg: 'rgba(13,148,136,0.08)',
              exercises: [] },
            { emoji: '⚡', title: 'HIIT Burn', subtitle: 'Circuit · 30min', color: '#EA580C', bg: 'rgba(234,88,12,0.08)',
              exercises: ['Burpees', 'Mountain Climber', 'Box Jump', 'Push-up', 'Russian Twist'] },
          ].map((p, i) => (
            <div key={i} onClick={() => {
              // Pre-fill LogWorkoutModal with this program
              const programData = {
                type: p.exercises.length > 0 ? (p.title === 'HIIT Burn' ? 'hiit' : 'gym') : 'running',
                exercises: p.exercises.map(name => ({
                  name,
                  sets: [{ kg: '', reps: '' }, { kg: '', reps: '' }, { kg: '', reps: '' }],
                })),
              }
              try { localStorage.setItem('fitsocial_program_prefill', JSON.stringify(programData)) } catch { /* ignore */ }
              setShowModal(true)
            }} style={{
              minWidth: '140px', background: p.bg,
              borderRadius: 'var(--radius)', padding: '14px',
              border: `1.5px solid ${p.color}22`, cursor: 'pointer',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>{p.emoji}</span>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif", lineHeight: 1.2 }}>{p.title}</p>
              <p style={{ fontSize: '10px', color: p.color, fontWeight: 600, marginTop: '3px' }}>{p.subtitle}</p>
              {p.exercises.length > 0 && (
                <p style={{ fontSize: '9px', color: 'var(--text-sub)', marginTop: '6px', lineHeight: 1.3 }}>
                  {p.exercises.slice(0, 3).join(' · ')}{p.exercises.length > 3 ? ` +${p.exercises.length - 3}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <LogWorkoutModal existing={activity} onSave={handleSaveActivity} onClose={() => setShowModal(false)} />
      )}

      {showNotifications && (
        <NotificationsPanel onClose={() => { setShowNotifications(false); setUnreadCount(0) }} />
      )}

      {badgeToast && (
        <div style={{
          position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white', borderRadius: '16px', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(79,70,229,0.45)',
          zIndex: 200, whiteSpace: 'nowrap',
          animation: 'slide-up 0.3s ease',
        }}>
          <span style={{ fontSize: '24px' }}>{badgeToast.icon}</span>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Badge sbloccato!</p>
            <p style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{badgeToast.title}</p>
          </div>
        </div>
      )}

      {prToast && (
        <div style={{
          position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          color: 'white', borderRadius: '16px', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(245,158,11,0.45)',
          zIndex: 201, whiteSpace: 'nowrap',
          animation: 'slide-up 0.3s ease',
        }}>
          <span style={{ fontSize: '24px' }}>🏆</span>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Nuovo Record!</p>
            <p style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{prToast}</p>
          </div>
        </div>
      )}

      {streakToast && (
        <div style={{
          position: 'fixed', bottom: badgeToast ? '148px' : '84px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #EA580C, #F97316)',
          color: 'white', borderRadius: '16px', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(234,88,12,0.4)',
          zIndex: 200, whiteSpace: 'nowrap',
          animation: 'slide-up 0.3s ease',
        }}>
          <span style={{ fontSize: '24px' }}>🔥</span>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Streak aumentata!</p>
            <p style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{(profile?.streak ?? 0) + 1} giorni consecutivi</p>
          </div>
        </div>
      )}
    </Layout>
  )
}
