import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { Challenge } from '../types'

export async function createChallenge(challenge: Omit<Challenge, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'challenges'), challenge)
  return ref.id
}

export async function joinChallenge(challengeId: string, userId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), {
    participants: arrayUnion(userId)
  })
}

export async function getActiveChallenges(): Promise<Challenge[]> {
  const now = Date.now()
  const q = query(collection(db, 'challenges'), where('endDate', '>', now))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge))
}

export async function updateScore(challengeId: string, userId: string, userName: string, score: number) {
  await updateDoc(doc(db, 'challenges', challengeId), {
    [`scores.${userId}`]: { userId, userName, score, verified: false }
  })
}
