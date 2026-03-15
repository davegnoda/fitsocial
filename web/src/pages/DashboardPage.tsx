import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getTodayActivity, saveActivity } from '../services/activityService'
import { updateUserXP } from '../services/userService'
import ActivityCard from '../components/ActivityCard'
import LogWorkoutModal from '../components/LogWorkoutModal'
import Layout from '../components/Layout'
import type { Activity } from '../types'

const LEVEL_TITLES = ['', 'Rookie', 'Runner', 'Atleta', 'Campione', 'Leggenda']

function scoreInfo(s: number) {
  if (s >= 80) return { label: 'ELITE', color: 'var(--lime)' }
  if (s >= 60) return { label: 'SOLID', color: 'var(--blue)' }
  if (s >= 40) return { label: 'ACTIVE', color: 'var(--amber)' }
  return { label: 'REST DAY', color: 'var(--text-sub)' }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile, refetch: refresh } = useUser()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (user) getTodayActivity(user.uid).then(setActivity).catch(() => {})
  }, [user])

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpToNext = level * 1000
  const xpPct = Math.min((xp % xpToNext) / xpToNext * 100, 100)

  const steps = activity?.steps ?? 0
  const calories = activity?.calories ?? 0
  const distance = activity?.distance ?? 0

  const formScore = Math.min(100, Math.round(
    (steps / 10000 * 30) + (calories / 500 * 25) + (distance / 8 * 25) + ((activity?.workouts?.length ?? 0) > 0 ? 20 : 0)
  ))
  const { label: scoreLabel, color: scoreColor } = scoreInfo(formScore)

  const handleSaveActivity = async (a: Activity) => {
    if (!user) return
    await saveActivity(user.uid, a)
    setActivity(a)
    const xpGain = 100 + Math.floor((a.steps ?? 0) / 1000) + Math.floor(a.distance ?? 0) + 50
    await updateUserXP(user.uid, xpGain)
    refresh()
  }

  const stats = [
    { icon: '👟', label: 'Passi', value: steps, unit: '/ 10k', goal: 10000, color: '#3b82f6', delay: 100 },
    { icon: '🔥', label: 'Calorie', value: calories, unit: 'kcal', goal: 500, color: '#f97316', delay: 200 },
    { icon: '📍', label: 'Distanza', value: distance, unit: 'km', goal: 8, color: '#10b981', delay: 300 },
    { icon: '❤️', label: 'Freq. cardiaca', value: activity?.heartRate ?? 0, unit: 'bpm', goal: 80, color: '#ef4444', delay: 400 },
  ]

  return (
    <Layout>
      {/* FORM SCORE HERO */}
      <div style={{ padding: '48px 20px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <div className="animate-fade" style={{ marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.2em' }}>
            FORM SCORE · {today}
          </span>
        </div>

        <div className="animate-count">
          <span
            className="font-display"
            style={{ fontSize: 'clamp(96px, 25vw, 160px)', color: scoreColor, display: 'block', lineHeight: 0.85 }}
          >
            {formScore}
          </span>
        </div>

        <div style={{ height: '2px', background: 'var(--border)', margin: '16px 0 10px', borderRadius: '1px', overflow: 'hidden' }}>
          <div className="animate-fill" style={{ width: `${formScore}%`, height: '100%', background: scoreColor }} />
        </div>

        <span style={{ fontSize: '11px', fontWeight: 700, color: scoreColor, letterSpacing: '0.25em' }}>
          {scoreLabel}
        </span>

        <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
            LV.<span style={{ color: 'var(--lime)', fontWeight: 700 }}>{level}</span>
            {' '}{LEVEL_TITLES[Math.min(level, 5)]}
          </span>
          <span style={{ width: '1px', height: '12px', background: 'var(--border-strong)', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{xp.toLocaleString()}</span> XP
          </span>
          <span style={{ width: '1px', height: '12px', background: 'var(--border-strong)', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
            🔥 <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{profile?.streak ?? 0}</span> streak
          </span>
        </div>

        <div style={{ height: '2px', background: 'var(--border)', marginTop: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: 'var(--purple)', transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* METRICS */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em' }}>
            ATTIVITÀ DI OGGI
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--lime)', letterSpacing: '0.1em',
            background: 'rgba(196,255,0,0.08)', padding: '2px 8px', borderRadius: '3px' }}>
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.map(s => <ActivityCard key={s.label} {...s} />)}
        </div>
      </div>

      {/* WORKOUTS */}
      {activity?.workouts && activity.workouts.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em' }}>
            ALLENAMENTI
          </span>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activity.workouts.map((w, i) => (
              <div key={i} className="flex items-center gap-3"
                style={{ background: 'var(--bg-card)', padding: '12px 14px', borderLeft: '3px solid var(--green)', borderRadius: '0 4px 4px 0' }}>
                <span style={{ fontSize: '18px' }}>
                  {w.type === 'running' ? '🏃' : w.type === 'cycling' ? '🚴' : w.type === 'gym' ? '💪' : w.type === 'hiit' ? '⚡' : '🚶'}
                </span>
                <div style={{ flex: 1 }}>
                  <span className="font-display" style={{ fontSize: '1rem', color: 'var(--text)' }}>{w.type.toUpperCase()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    {w.duration}m{w.distance ? ` · ${w.distance}km` : ''}
                  </span>
                </div>
                {w.verified && <span style={{ fontSize: '10px', color: 'var(--green)', letterSpacing: '0.1em' }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SMARTWATCH CTA */}
      <div style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3"
          style={{ padding: '14px 16px', border: '1px solid var(--border-strong)', borderRadius: '6px' }}>
          <span style={{ fontSize: '20px' }}>⌚</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Collega il tuo smartwatch</p>
            <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>Sync automatico via app mobile</p>
          </div>
        </div>
      </div>

      {/* LOG FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed z-40 flex items-center gap-2 font-display"
        style={{
          bottom: '76px', right: '16px',
          background: 'var(--lime)', color: '#000',
          fontSize: '1.1rem', letterSpacing: '0.05em',
          padding: '10px 18px', borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(196,255,0,0.3)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        LOG
      </button>

      {showModal && (
        <LogWorkoutModal existing={activity} onSave={handleSaveActivity} onClose={() => setShowModal(false)} />
      )}
    </Layout>
  )
}
