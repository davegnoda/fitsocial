import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { calculateXP, calculateLevel, calculateStreak, getMetricValue, estimate1RM } from '../utils/scoring'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

export const onActivityCreated = onDocumentCreated(
  'users/{userId}/activities/{activityId}',
  async (event) => {
    const snap = event.data
    if (!snap) return

    const userId = event.params.userId
    const activity = snap.data()

    // 1. Calculate and update XP, level, streak
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()
    if (!userDoc.exists) return

    const user = userDoc.data()!
    const gainedXp = calculateXP(activity as any)
    const newXp = (user.xp ?? 0) + gainedXp
    const newLevel = calculateLevel(newXp)
    const newStreak = calculateStreak(user.lastActive, user.streak ?? 0)
    const today = new Date().toISOString().split('T')[0]
    const leveledUp = newLevel > (user.level ?? 1)

    await userRef.update({
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      lastActive: today,
    })

    // 2. Sync scores to all active challenges
    const now = Date.now()
    const challengesSnap = await db.collection('challenges')
      .where('endDate', '>', now)
      .get()

    const joinedChallenges = challengesSnap.docs.filter(
      d => (d.data().participants ?? []).includes(userId)
    )

    await Promise.all(joinedChallenges.map(c => {
      const score = getMetricValue(c.data().type, activity as any)
      return c.ref.update({
        [`scores.${userId}`]: {
          userId,
          userName: user.name ?? 'Unknown',
          score,
          verified: activity.verified ?? false,
        }
      })
    }))

    // 3. Sync scores to active duels
    const duelsSnap = await db.collection('duels')
      .where('status', '==', 'active')
      .get()

    const userDuels = duelsSnap.docs.filter(d => {
      const data = d.data()
      return data.challenger === userId || data.opponent === userId
    })

    await Promise.all(userDuels.map(d => {
      const score = getMetricValue(d.data().type, activity as any)
      return d.ref.update({ [`scores.${userId}`]: score })
    }))

    // 4. Check and unlock achievements
    const achievementsRef = db.collection('users').doc(userId).collection('achievements').doc('all')
    const achievDoc = await achievementsRef.get()
    const existing = achievDoc.exists ? achievDoc.data()! : {}
    const existingIds = new Set(Object.keys(existing))

    const totalActsSnap = await db.collection('users').doc(userId).collection('activities').get()
    const totalActs = totalActsSnap.size
    const totalSteps = totalActsSnap.docs.reduce((sum, d) => sum + (d.data().steps ?? 0), 0)

    const friendsSnap = await db.collection('users').doc(userId).collection('friends').get()
    const friendCount = friendsSnap.docs.filter(d => d.data().status === 'accepted').length

    // Count won challenges from already-settled challenges
    const settledSnap = await db.collection('challenges')
      .where('settled', '==', true)
      .get()
    const wonChallenges = settledSnap.docs.filter(d => d.data().prize?.winnerId === userId).length

    const checks: [string, boolean][] = [
      ['first_workout', totalActs >= 1],
      ['streak_7', newStreak >= 7],
      ['streak_30', newStreak >= 30],
      ['steps_50k', totalSteps >= 50000],
      ['steps_100k', totalSteps >= 100000],
      ['challenges_1', wonChallenges >= 1],
      ['friends_5', friendCount >= 5],
      ['level_5', newLevel >= 5],
      ['level_10', newLevel >= 10],
    ]

    const newBadges: Record<string, number> = {}
    for (const [id, condition] of checks) {
      if (condition && !existingIds.has(id)) {
        newBadges[id] = Date.now()
      }
    }

    if (Object.keys(newBadges).length > 0) {
      await achievementsRef.set({ ...existing, ...newBadges }, { merge: true })
      for (const badgeId of Object.keys(newBadges)) {
        await sendNotification({
          userId,
          type: 'achievement',
          title: 'Nuovo Badge!',
          body: `Hai sbloccato: ${badgeId}`,
          data: { badgeId }
        })
      }
    }

    // 5. Publish to feed
    const feedId = `${userId}_${activity.date}`
    await db.collection('feed').doc(feedId).set({
      userId,
      userName: user.name ?? 'Unknown',
      date: activity.date,
      workoutTypes: (activity.workouts ?? []).map((w: any) => w.type),
      steps: activity.steps ?? 0,
      calories: activity.calories ?? 0,
      distance: activity.distance ?? 0,
      duration: (activity.workouts ?? []).reduce((s: number, w: any) => s + (w.duration ?? 0), 0),
      reactions: {},
      createdAt: Date.now(),
    }, { merge: true })

    // 6. Check and update PRs
    const prsRef = db.collection('users').doc(userId).collection('meta').doc('prs')
    const prsDoc = await prsRef.get()
    const prs = prsDoc.exists ? prsDoc.data()! : {}

    const updates: Record<string, any> = {}
    if ((activity.steps ?? 0) > (prs.maxSteps ?? 0)) updates.maxSteps = activity.steps
    if ((activity.distance ?? 0) > (prs.maxDistance ?? 0)) updates.maxDistance = activity.distance
    if ((activity.calories ?? 0) > (prs.maxCalories ?? 0)) updates.maxCalories = activity.calories

    const exercisePRs: Record<string, any> = prs.exercises ?? {}
    for (const workout of (activity.workouts ?? [])) {
      for (const exercise of (workout.exercises ?? [])) {
        const current = exercisePRs[exercise.name] ?? { maxWeight: 0, maxVolume: 0, estimated1RM: 0 }
        let changed = false
        for (const set of exercise.sets) {
          if (set.kg > current.maxWeight) { current.maxWeight = set.kg; changed = true }
          const volume = set.kg * set.reps
          if (volume > current.maxVolume) { current.maxVolume = volume; changed = true }
          const e1rm = estimate1RM(set.kg, set.reps)
          if (e1rm > current.estimated1RM) { current.estimated1RM = e1rm; changed = true }
        }
        if (changed) {
          current.date = activity.date
          exercisePRs[exercise.name] = current
        }
      }
    }
    updates.exercises = exercisePRs

    if (Object.keys(updates).length > 0) {
      await prsRef.set({ ...prs, ...updates }, { merge: true })
    }

    // 7. Level up notification
    if (leveledUp) {
      await sendNotification({
        userId,
        type: 'system',
        title: 'Level Up!',
        body: `Sei salito al livello ${newLevel}!`,
      })
    }
  }
)
