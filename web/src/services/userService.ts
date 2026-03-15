import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
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

export async function updateUserXP(uid: string, gainedXp: number) {
  const profile = await getUserProfile(uid)
  if (!profile) return
  const newXp = (profile.xp ?? 0) + gainedXp
  const newLevel = Math.floor(newXp / 1000) + 1
  const today = new Date().toISOString().split('T')[0]
  const lastActive = (profile as UserProfile & { lastActive?: string }).lastActive
  const isNewDay = lastActive !== today
  const wasYesterday = lastActive === new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const newStreak = isNewDay ? (wasYesterday ? (profile.streak ?? 0) + 1 : 1) : profile.streak ?? 0
  await updateDoc(doc(db, 'users', uid), {
    xp: newXp,
    level: newLevel,
    streak: newStreak,
    lastActive: today,
  })
}
