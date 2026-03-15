import { doc, setDoc, getDocs, collection, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { UserProfile, FriendRequest } from '../types'

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
