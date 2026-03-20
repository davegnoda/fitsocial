import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { ExercisePR } from '../types'

export interface PersonalRecords {
  maxSteps: number
  maxDistance: number
  maxCalories: number
  exercisePRs?: Record<string, ExercisePR>
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecords | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'meta', 'prs'))
  return snap.exists() ? (snap.data() as PersonalRecords) : null
}
