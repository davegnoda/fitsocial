import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import type { CommunityGroup, CommunityEvent } from '../types'

export async function getGroups(city: string): Promise<CommunityGroup[]> {
  const q = city
    ? query(collection(db, 'groups'), where('city', '==', city), limit(20))
    : query(collection(db, 'groups'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityGroup))
}

export async function joinGroup(groupId: string, userId: string) {
  await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(userId) })
}

export async function createGroup(data: Omit<CommunityGroup, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), data)
  return ref.id
}

export async function getEvents(city: string): Promise<CommunityEvent[]> {
  const q = city
    ? query(collection(db, 'events'), where('city', '==', city), where('date', '>', Date.now()), orderBy('date'), limit(20))
    : query(collection(db, 'events'), where('date', '>', Date.now()), orderBy('date'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityEvent))
}

export async function joinEvent(eventId: string, userId: string) {
  await updateDoc(doc(db, 'events', eventId), { participants: arrayUnion(userId) })
}

export async function createEvent(data: Omit<CommunityEvent, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), data)
  return ref.id
}
