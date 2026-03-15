import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFriends, getPendingRequests } from '../services/friendService'
import Layout from '../components/Layout'
import type { UserProfile } from '../types'

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [pending, setPending] = useState<{ uid: string; profile: UserProfile }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getFriends(user.uid),
      getPendingRequests(user.uid)
    ]).then(([f, p]) => {
      setFriends(f)
      setPending(p)
      setLoading(false)
    })
  }, [user])

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  }

  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5">
        <h1 className="text-2xl font-bold">Amici 👥</h1>
        <p className="text-sm text-gray-400 mt-1">{friends.length} amici · {pending.length} richieste</p>
      </div>

      <div className="px-5 py-5">
        {loading && <p className="text-center text-gray-400 py-10">Caricamento...</p>}

        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Richieste pendenti</h2>
            <div className="space-y-2">
              {pending.map(({ uid, profile: p }) => (
                <div key={uid} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">
                    {p.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.city}</p>
                  </div>
                  <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">
                    Accetta
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">I tuoi amici</h2>
          {friends.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-gray-500">Nessun amico ancora</p>
              <p className="text-sm text-gray-400 mt-1">Invita qualcuno a unirsi a FitSocial!</p>
            </div>
          )}
          <div className="space-y-2">
            {friends.map(f => (
              <div key={f.uid} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {f.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.city} · Lv. {f.level}</p>
                </div>
                {f.fitnessLevel && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${levelColors[f.fitnessLevel] ?? ''}`}>
                    {f.fitnessLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
