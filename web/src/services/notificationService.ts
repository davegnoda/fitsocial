import { collection, getDocs, updateDoc, addDoc, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { AppNotification } from '../types'

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))
}

export async function getUnreadCount(userId: string): Promise<number> {
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  return snap.size
}

export async function markAllRead(userId: string) {
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
}

export async function addNotification(userId: string, notification: Omit<AppNotification, 'id'>) {
  await addDoc(collection(db, 'users', userId, 'notifications'), notification)
}
