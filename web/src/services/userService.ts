import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import type { UserProfile } from '../types'

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    level: 1,
    xp: 0,
    streak: 0,
    connectedDevices: [],
    plan: 'free',
    country: 'IT',
    createdAt: Date.now(),
    ...data,
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function searchUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as UserProfile
}

export async function getTopUsers(n: number = 10): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as UserProfile)
}

export async function getTopUsersByRecentActivity(days: number, maxUsers: number = 10): Promise<(UserProfile & { recentSteps: number })[]> {
  const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50)))
  const users = usersSnap.docs.map(d => d.data() as UserProfile)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffDate = cutoff.toISOString().split('T')[0]

  const withSteps = await Promise.all(users.map(async u => {
    try {
      const actSnap = await getDocs(collection(db, 'users', u.uid, 'activities'))
      const recentSteps = actSnap.docs
        .filter(d => { const data = d.data() as { date?: string }; return (data.date ?? '') >= cutoffDate })
        .reduce((sum, d) => { const data = d.data() as { steps?: number }; return sum + (data.steps ?? 0) }, 0)
      return { ...u, recentSteps }
    } catch {
      return { ...u, recentSteps: 0 }
    }
  }))

  return withSteps.sort((a, b) => b.recentSteps - a.recentSteps).slice(0, maxUsers)
}
