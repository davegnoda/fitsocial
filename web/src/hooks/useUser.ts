import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile } from '../services/userService'
import type { UserProfile } from '../types'

export function useUser() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    // 2.5s fallback so the app never hangs if Firestore is slow or unavailable
    const timeout = setTimeout(() => setLoading(false), 2500)
    getUserProfile(user.uid)
      .then(p => { setProfile(p); setLoading(false) })
      .catch(() => { setLoading(false) })
      .finally(() => clearTimeout(timeout))
  }, [user])

  return { profile, loading, refetch: () => user && getUserProfile(user.uid).then(setProfile) }
}
