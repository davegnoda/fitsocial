import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getTodayActivity } from '../services/activityService'
import ActivityCard from '../components/ActivityCard'
import Layout from '../components/Layout'
import type { Activity } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const [activity, setActivity] = useState<Activity | null>(null)

  useEffect(() => {
    if (user) getTodayActivity(user.uid).then(setActivity).catch(err => console.error('Failed to load data:', err))
  }, [user])

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  const stats = [
    { icon: '👟', label: 'Passi', value: activity?.steps ?? 0, unit: 'passi oggi', goal: 10000, color: '#3b82f6' },
    { icon: '🔥', label: 'Calorie', value: activity?.calories ?? 0, unit: 'kcal bruciate', goal: 500, color: '#f97316' },
    { icon: '📍', label: 'Distanza', value: activity?.distance ?? 0, unit: 'km percorsi', goal: 8, color: '#10b981' },
    { icon: '❤️', label: 'Battito', value: activity?.heartRate ?? 0, unit: 'bpm medio', goal: 80, color: '#ef4444' },
  ]

  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5">
        <p className="text-sm text-gray-400 capitalize">{today}</p>
        <h1 className="text-2xl font-bold mt-0.5">
          Ciao, {profile?.name?.split(' ')[0] ?? 'Atleta'} 👋
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
            Lv. {profile?.level ?? 1}
          </span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
            🔥 {profile?.streak ?? 0} giorni streak
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold capitalize">
            {profile?.fitnessLevel ?? 'beginner'}
          </span>
        </div>
      </div>

      <div className="px-5 py-5">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Attività di oggi</h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => <ActivityCard key={s.label} {...s} />)}
        </div>

        {activity?.workouts && activity.workouts.length > 0 && (
          <div className="mt-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Allenamenti</h2>
            <div className="space-y-2">
              {activity.workouts.map((w, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                  <span className="text-2xl">
                    {w.type === 'running' ? '🏃' : w.type === 'cycling' ? '🚴' : w.type === 'gym' ? '💪' : '🏋️'}
                  </span>
                  <div>
                    <p className="font-semibold capitalize">{w.type}</p>
                    <p className="text-sm text-gray-400">{w.duration} min{w.distance ? ` · ${w.distance} km` : ''}</p>
                  </div>
                  {w.verified && <span className="ml-auto text-green-500 text-xs font-semibold">✓ Verificato</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-sm text-blue-700">
            📱 Collega l'app mobile per sincronizzare automaticamente i dati dal tuo smartwatch
          </p>
        </div>
      </div>
    </Layout>
  )
}
