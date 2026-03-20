import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Duel } from '../types'

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

export async function createDuel(challengerId: string, opponentId: string, type: string, duration: string, betAmount?: number) {
  const res = await fetch(`${FUNCTIONS_URL}/createDuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengerId, opponentId, type, duration, betAmount }),
  })
  return res.json()
}

export async function acceptDuel(userId: string, duelId: string) {
  const res = await fetch(`${FUNCTIONS_URL}/acceptDuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, duelId }),
  })
  return res.json()
}

export function subscribeToActiveDuels(userId: string, callback: (duels: Duel[]) => void) {
  const q = query(collection(db, 'duels'), where('status', '==', 'active'))
  return onSnapshot(q, snap => {
    const duels = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Duel))
      .filter(d => d.challenger === userId || d.opponent === userId)
    callback(duels)
  })
}

export async function getUserDuels(userId: string): Promise<Duel[]> {
  const q = query(collection(db, 'duels'), where('status', 'in', ['active', 'pending']))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Duel))
    .filter(d => d.challenger === userId || d.opponent === userId)
}
