import { doc, setDoc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { Activity } from '../types'

export async function getTodayActivity(userId: string): Promise<Activity | null> {
  const today = new Date().toISOString().split('T')[0]
  const snap = await getDoc(doc(db, 'users', userId, 'activities', today))
  return snap.exists() ? (snap.data() as Activity) : null
}

export async function saveActivity(userId: string, activity: Activity) {
  await setDoc(doc(db, 'users', userId, 'activities', activity.date), activity)
}

export async function getWeeklyActivities(userId: string): Promise<Activity[]> {
  const q = query(
    collection(db, 'users', userId, 'activities'),
    orderBy('date', 'desc'),
    limit(7)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Activity)
}
