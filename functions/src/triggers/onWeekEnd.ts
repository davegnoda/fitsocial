import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

function getWeekId(date: Date): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const
const PROMOTE_COUNT = 3
const RELEGATE_COUNT = 3

export const onWeekEnd = onSchedule('every sunday 23:55', async () => {
  const now = new Date()
  const currentWeek = getWeekId(now)
  const leagueRef = db.collection('leagues').doc(currentWeek)
  const leagueDoc = await leagueRef.get()

  if (!leagueDoc.exists) return

  const league = leagueDoc.data()!
  const promotions: string[] = []
  const relegations: string[] = []

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i]
    const users: string[] = league.tiers?.[tier]?.users ?? []
    if (users.length === 0) continue

    const userXps = await Promise.all(users.map(async uid => {
      const userDoc = await db.collection('users').doc(uid).get()
      const weeklyXp = userDoc.data()?.weeklyXp ?? 0
      return { uid, xp: weeklyXp }
    }))

    userXps.sort((a, b) => b.xp - a.xp)

    if (i < TIERS.length - 1) {
      const toPromote = userXps.slice(0, PROMOTE_COUNT).map(u => u.uid)
      promotions.push(...toPromote)
      for (const uid of toPromote) {
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Promosso!',
          body: `Sei salito alla lega ${TIERS[i + 1].toUpperCase()}!`,
        })
      }
    }

    if (i > 0) {
      const toRelegate = userXps.slice(-RELEGATE_COUNT).map(u => u.uid)
      relegations.push(...toRelegate)
      for (const uid of toRelegate) {
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Retrocesso',
          body: `Sei sceso alla lega ${TIERS[i - 1].toUpperCase()}. Dai che ce la fai!`,
        })
      }
    }
  }

  await leagueRef.update({ promotions, relegations, settled: true })

  // Create next week's league
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekId = getWeekId(nextWeek)

  const cutoffDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const usersSnap = await db.collection('users')
    .where('lastActive', '>=', cutoffDate)
    .get()

  const tiers: Record<string, { minXP: number; users: string[] }> = {
    bronze: { minXP: 0, users: [] },
    silver: { minXP: 500, users: [] },
    gold: { minXP: 1500, users: [] },
    diamond: { minXP: 3000, users: [] },
  }

  for (const userDoc of usersSnap.docs) {
    const xp = userDoc.data().xp ?? 0
    const uid = userDoc.id
    if (xp >= 3000) tiers.diamond.users.push(uid)
    else if (xp >= 1500) tiers.gold.users.push(uid)
    else if (xp >= 500) tiers.silver.users.push(uid)
    else tiers.bronze.users.push(uid)
  }

  const batch = db.batch()
  usersSnap.docs.forEach(d => batch.update(d.ref, { weeklyXp: 0 }))
  await batch.commit()

  await db.collection('leagues').doc(nextWeekId).set({
    week: nextWeekId,
    tiers,
    promotions: [],
    relegations: [],
    settled: false,
    createdAt: Date.now(),
  })
})
