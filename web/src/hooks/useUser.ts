import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile } from '../services/userService'
import { UserProfile } from '../types'

export function useUser() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    getUserProfile(user.uid).then(p => {
      setProfile(p)
      setLoading(false)
    })
  }, [user])

  return { profile, loading, refetch: () => user && getUserProfile(user.uid).then(setProfile) }
}
