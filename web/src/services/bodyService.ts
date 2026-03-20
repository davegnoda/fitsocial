import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import type { WeightEntry, InjuryLog, BodyMeasurement } from '../types'

export async function logWeight(userId: string, entry: WeightEntry) {
  await addDoc(collection(db, 'users', userId, 'weights'), entry)
}

export async function getWeightHistory(userId: string, n = 12): Promise<WeightEntry[]> {
  const q = query(collection(db, 'users', userId, 'weights'), orderBy('date', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as WeightEntry).reverse()
}

export async function logInjury(userId: string, entry: InjuryLog) {
  await addDoc(collection(db, 'users', userId, 'injuries'), entry)
}

export async function getRecentInjuries(userId: string, n = 5): Promise<InjuryLog[]> {
  const q = query(collection(db, 'users', userId, 'injuries'), orderBy('date', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as InjuryLog)
}

export async function logMeasurement(userId: string, entry: BodyMeasurement) {
  await addDoc(collection(db, 'users', userId, 'measurements'), entry)
}

export async function getMeasurementHistory(userId: string, n = 12): Promise<BodyMeasurement[]> {
  const q = query(collection(db, 'users', userId, 'measurements'), orderBy('date', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as BodyMeasurement).reverse()
}
