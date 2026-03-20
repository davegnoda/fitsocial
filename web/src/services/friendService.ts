import { doc, setDoc, getDocs, collection, getDoc, query, where, limit, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import type { UserProfile, FriendRequest } from '../types'

export async function sendFriendRequest(fromId: string, toId: string) {
  await setDoc(doc(db, 'users', fromId, 'friends', toId), { status: 'pending', direction: 'sent' })
  await setDoc(doc(db, 'users', toId, 'friends', fromId), { status: 'pending', direction: 'received' })
}

export async function acceptFriendRequest(userId: string, friendId: string) {
  await setDoc(doc(db, 'users', userId, 'friends', friendId), { status: 'accepted', direction: 'received' })
  await setDoc(doc(db, 'users', friendId, 'friends', userId), { status: 'accepted', direction: 'sent' })
}

export async function getFriends(userId: string): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'friends'))
  const accepted = snap.docs.filter(d => (d.data() as FriendRequest).status === 'accepted')
  const profiles = await Promise.all(accepted.map(d => getDoc(doc(db, 'users', d.id))))
  return profiles.filter(p => p.exists()).map(p => p.data() as UserProfile)
}

export async function getActiveFriends(userId: string): Promise<UserProfile[]> {
  const friends = await getFriends(userId)
  const today = new Date().toISOString().split('T')[0]
  return friends.filter(f => f.lastActive === today)
}

export async function getPendingRequests(userId: string): Promise<{ uid: string; profile: UserProfile }[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'friends'))
  const pending = snap.docs.filter(d => {
    const data = d.data() as FriendRequest
    return data.status === 'pending' && data.direction === 'received'
  })
  const profiles = await Promise.all(pending.map(async d => {
    const p = await getDoc(doc(db, 'users', d.id))
    return p.exists() ? { uid: d.id, profile: p.data() as UserProfile } : null
  }))
  return profiles.filter(Boolean) as { uid: string; profile: UserProfile }[]
}

export async function isFriend(userId: string, otherId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', userId, 'friends', otherId))
  return snap.exists() && (snap.data() as FriendRequest).status === 'accepted'
}

export async function getSuggestedUsers(userId: string, city?: string): Promise<UserProfile[]> {
  // Fetch existing connections to exclude them
  const friendsSnap = await getDocs(collection(db, 'users', userId, 'friends')).catch(() => null)
  const knownUids = new Set<string>(friendsSnap ? friendsSnap.docs.map(d => d.id) : [])
  knownUids.add(userId)

  let users: UserProfile[]
  if (city) {
    const cityQ = query(collection(db, 'users'), where('city', '==', city), limit(30))
    const citySnap = await getDocs(cityQ)
    users = citySnap.docs.map(d => d.data() as UserProfile)
    // Pad with global users if not enough local ones
    if (users.filter(u => !knownUids.has(u.uid)).length < 5) {
      const globalQ = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(30))
      const globalSnap = await getDocs(globalQ)
      const global = globalSnap.docs.map(d => d.data() as UserProfile)
      const merged = new Map<string, UserProfile>()
      ;[...users, ...global].forEach(u => merged.set(u.uid, u))
      users = Array.from(merged.values())
    }
  } else {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(30))
    const snap = await getDocs(q)
    users = snap.docs.map(d => d.data() as UserProfile)
  }
  return users.filter(p => !knownUids.has(p.uid)).slice(0, 20)
}
