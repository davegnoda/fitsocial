import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { WeeklyLeague } from '../types'

function getCurrentWeekId(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export async function getCurrentLeague(): Promise<WeeklyLeague | null> {
  const weekId = getCurrentWeekId()
  const snap = await getDoc(doc(db, 'leagues', weekId))
  return snap.exists() ? (snap.data() as WeeklyLeague) : null
}

export function getUserTier(league: WeeklyLeague, userId: string): string | null {
  for (const [tier, data] of Object.entries(league.tiers)) {
    if (data.users.includes(userId)) return tier
  }
  return null
}
