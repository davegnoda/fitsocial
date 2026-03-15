import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import Layout from '../components/Layout'

export default function ProfilePage() {
  const { logout } = useAuth()
  const { profile } = useUser()

  const stats = [
    { label: 'Livello', value: profile?.level ?? 1, icon: '⭐' },
    { label: 'XP', value: (profile?.xp ?? 0).toLocaleString(), icon: '💎' },
    { label: 'Streak', value: `${profile?.streak ?? 0}gg`, icon: '🔥' },
  ]

  return (
    <Layout>
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.name ?? 'Atleta'}</h1>
            <p className="text-blue-100 text-sm">{profile?.city} · {profile?.plan === 'premium' ? '⭐ Premium' : 'Free'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-blue-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">Fitness Passport</p>
            <p className="text-xs text-gray-400 mt-0.5">I tuoi traguardi verificati</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-sm text-gray-400">Completa sfide per sbloccare il tuo Passport</p>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-50 hover:bg-gray-50">
            Impostazioni account
          </button>
          <button className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-50 hover:bg-gray-50">
            Connetti smartwatch
          </button>
          <button className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-50 hover:bg-gray-50">
            Privacy e GDPR
          </button>
          <button onClick={logout}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50">
            Esci
          </button>
        </div>
      </div>
    </Layout>
  )
}
