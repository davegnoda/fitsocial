import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getTodayActivity } from '../services/activityService'
import ActivityCard from '../components/ActivityCard'
import Layout from '../components/Layout'
import type { Activity } from '../types'

const LEVEL_TITLES = ['', 'Rookie', 'Runner', 'Atleta', 'Campione', 'Leggenda']

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const [activity, setActivity] = useState<Activity | null>(null)

  useEffect(() => {
    if (user) getTodayActivity(user.uid).then(setActivity).catch(() => {})
  }, [user])

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpToNext = level * 1000
  const xpPercent = Math.min((xp % xpToNext) / xpToNext * 100, 100)

  const stats = [
    { icon: '👟', label: 'Passi', value: activity?.steps ?? 0, unit: 'passi oggi', goal: 10000, color: '#3b82f6', delay: 100 },
    { icon: '🔥', label: 'Calorie', value: activity?.calories ?? 0, unit: 'kcal bruciate', goal: 500, color: '#f97316', delay: 200 },
    { icon: '📍', label: 'Distanza', value: activity?.distance ?? 0, unit: 'km percorsi', goal: 8, color: '#10b981', delay: 300 },
    { icon: '❤️', label: 'Battito', value: activity?.heartRate ?? 0, unit: 'bpm medio', goal: 80, color: '#ef4444', delay: 400 },
  ]

  return (
    <Layout>
      {/* Hero Header */}
      <div
        className="relative px-5 pt-12 pb-6 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0F0F14 0%, #07070A 100%)',
          borderBottom: '1px solid #1C1C24',
        }}
      >
        {/* Background glow effect */}
        <div
          className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,69,0,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Date */}
        <p className="text-xs uppercase tracking-widest capitalize" style={{ color: '#FF4500', fontWeight: 600 }}>
          {today}
        </p>

        {/* Greeting */}
        <h1
          className="mt-1 leading-tight"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '2.8rem',
            fontWeight: 800,
            color: '#F8F8FC',
            letterSpacing: '-0.01em',
          }}
        >
          CIAO,<br />
          <span style={{ color: '#FF4500' }}>
            {(profile?.name?.split(' ')[0] ?? 'ATLETA').toUpperCase()}
          </span>
        </h1>

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(184,255,0,0.08)', border: '1px solid rgba(184,255,0,0.2)', color: '#B8FF00' }}
          >
            <span>⚡</span>
            <span>LV.{level} {LEVEL_TITLES[Math.min(level, 5)]}</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.2)', color: '#FF4500' }}
          >
            <span>🔥</span>
            <span>{profile?.streak ?? 0} streak</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize"
            style={{ background: 'rgba(61,158,255,0.08)', border: '1px solid rgba(61,158,255,0.2)', color: '#3D9EFF' }}
          >
            <span>{profile?.fitnessLevel ?? 'beginner'}</span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs" style={{ color: '#8A8A96' }}>XP Progress</span>
            <span className="text-xs font-bold" style={{ color: '#B8FF00' }}>{xp} / {xpToNext} XP</span>
          </div>
          <div className="rounded-full" style={{ height: '4px', background: '#1C1C24' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${xpPercent}%`,
                background: 'linear-gradient(90deg, #B8FF00, #3D9EFF)',
                boxShadow: '0 0 12px rgba(184,255,0,0.4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#8A8A96' }}>
            Attività di oggi
          </h2>
          <span className="text-xs font-bold" style={{ color: '#FF4500' }}>LIVE</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => <ActivityCard key={s.label} {...s} />)}
        </div>
      </div>

      {/* Workouts */}
      {activity?.workouts && activity.workouts.length > 0 && (
        <div className="px-4 pt-5">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#8A8A96' }}>
            Allenamenti
          </h2>
          <div className="space-y-2">
            {activity.workouts.map((w, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: '#141419', border: '1px solid #1C1C24' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)' }}
                >
                  {w.type === 'running' ? '🏃' : w.type === 'cycling' ? '🚴' : w.type === 'gym' ? '💪' : '🏋️'}
                </div>
                <div className="flex-1">
                  <p className="font-bold capitalize" style={{ color: '#F8F8FC' }}>{w.type}</p>
                  <p className="text-sm" style={{ color: '#8A8A96' }}>
                    {w.duration} min{w.distance ? ` · ${w.distance} km` : ''}
                  </p>
                </div>
                {w.verified && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: '#B8FF00', background: 'rgba(184,255,0,0.1)' }}>
                    ✓ Verificato
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smartwatch CTA */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(61,158,255,0.08), rgba(61,158,255,0.03))',
            border: '1px solid rgba(61,158,255,0.2)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(61,158,255,0.1)' }}
          >
            ⌚
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#3D9EFF' }}>Collega il tuo smartwatch</p>
            <p className="text-xs mt-0.5" style={{ color: '#8A8A96' }}>
              Sincronizza dati automaticamente dall'app mobile
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
