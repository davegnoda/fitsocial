import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Achievement } from '../types'

export interface BadgeDefinition {
  id: string
  title: string
  description: string
  icon: string
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_workout', title: 'Prima Vittoria', description: 'Completa il tuo primo allenamento', icon: '🎯' },
  { id: 'streak_7', title: 'Settimana Perfetta', description: '7 giorni di streak consecutivi', icon: '🔥' },
  { id: 'streak_30', title: 'Inarrestabile', description: '30 giorni di streak', icon: '💎' },
  { id: 'steps_50k', title: 'Camminatore', description: 'Raggiungi 50.000 passi totali', icon: '👟' },
  { id: 'steps_100k', title: 'Maratoneta', description: 'Raggiungi 100.000 passi totali', icon: '🏅' },
  { id: 'challenges_1', title: 'Sfidante', description: 'Vinci la tua prima sfida', icon: '🏆' },
  { id: 'friends_5', title: 'Sociale', description: 'Aggiungi 5 amici', icon: '👥' },
  { id: 'level_5', title: 'Esperto', description: 'Raggiungi il livello 5', icon: '⭐' },
  { id: 'level_10', title: 'Leggenda', description: 'Raggiungi il livello 10', icon: '👑' },
]

export async function getUnlockedAchievements(userId: string): Promise<Achievement[]> {
  const snap = await getDoc(doc(db, 'users', userId, 'achievements', 'all'))
  if (!snap.exists()) return []
  const data = snap.data()
  return Object.entries(data).map(([id, ts]) => ({ id, unlockedAt: ts as number }))
}
