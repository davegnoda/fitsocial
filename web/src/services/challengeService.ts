import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Challenge, LeaderboardEntry } from '../types'

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
  return snap.docs.map(d => {
    const data = d.data()
    const scores = data.scores ?? {}
    const leaderboard: LeaderboardEntry[] = Object.values(scores)
      .map((s: any) => ({ userId: s.userId, userName: s.userName, score: s.score, verified: s.verified ?? false }))
      .sort((a, b) => b.score - a.score)
    return { id: d.id, ...data, leaderboard } as Challenge
  })
}

export async function getWonChallenges(userId: string): Promise<number> {
  const q = query(collection(db, 'challenges'), where('endDate', '<', Date.now()))
  const snap = await getDocs(q)
  return snap.docs.filter(d => {
    const scores = d.data().scores ?? {}
    const entries = Object.values(scores) as { userId: string; score: number }[]
    if (entries.length === 0) return false
    entries.sort((a, b) => b.score - a.score)
    return entries[0].userId === userId
  }).length
}
