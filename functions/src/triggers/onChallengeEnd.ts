import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

export const onChallengeEnd = onSchedule('every 1 hours', async () => {
  const now = Date.now()

  // 1. End expired challenges
  const challengesSnap = await db.collection('challenges')
    .where('endDate', '<=', now)
    .where('settled', '==', false)
    .get()

  for (const doc of challengesSnap.docs) {
    const challenge = doc.data()
    const scores = challenge.scores ?? {}
    const entries = Object.entries(scores)
      .map(([uid, s]: [string, any]) => ({ userId: uid, userName: s.userName, score: s.score, verified: s.verified }))
      .sort((a, b) => b.score - a.score)

    if (entries.length === 0) {
      await doc.ref.update({ settled: true })
      continue
    }

    const isPaidChallenge = challenge.prize?.type === 'pool'
    let effectiveWinner = entries[0]
    if (isPaidChallenge) {
      const verifiedEntries = entries.filter(e => e.verified)
      if (verifiedEntries.length > 0) {
        effectiveWinner = verifiedEntries[0]
      }
    }

    await doc.ref.update({
      settled: true,
      'prize.winnerId': effectiveWinner.userId,
      'prize.payoutStatus': isPaidChallenge ? 'pending' : null,
    })

    await sendNotification({
      userId: effectiveWinner.userId,
      type: 'system',
      title: 'Hai vinto!',
      body: `Hai vinto la sfida "${challenge.title}"!`,
      data: { challengeId: doc.id }
    })
  }

  // 2. End expired duels
  const duelsSnap = await db.collection('duels')
    .where('endsAt', '<=', now)
    .where('status', '==', 'active')
    .get()

  for (const doc of duelsSnap.docs) {
    const duel = doc.data()
    const scores = duel.scores ?? {}
    const challengerScore = scores[duel.challenger] ?? 0
    const opponentScore = scores[duel.opponent] ?? 0

    const winnerId = challengerScore >= opponentScore ? duel.challenger : duel.opponent
    const loserId = winnerId === duel.challenger ? duel.opponent : duel.challenger

    await doc.ref.update({ status: 'completed', winnerId })

    await sendNotification({
      userId: winnerId,
      type: 'duel',
      title: 'Duello vinto!',
      body: `Hai vinto il duello!`,
    })

    await sendNotification({
      userId: loserId,
      type: 'duel',
      title: 'Duello concluso',
      body: 'Hai perso il duello. Riprova!',
    })
  }

  // 3. Streak battle daily check
  const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
  const battlesSnap = await db.collection('streak-battles')
    .where('status', '==', 'active')
    .get()

  for (const doc of battlesSnap.docs) {
    const battle = doc.data()
    const survivors: string[] = battle.survivors ?? []
    const newSurvivors: string[] = []
    const newEliminated: string[] = [...(battle.eliminated ?? [])]

    for (const uid of survivors) {
      const actSnap = await db.collection('users').doc(uid).collection('activities').doc(yesterday).get()
      if (actSnap.exists) {
        newSurvivors.push(uid)
      } else {
        newEliminated.push(uid)
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Eliminato!',
          body: 'Hai saltato un giorno e sei stato eliminato dalla Streak Battle!',
        })
      }
    }

    const update: Record<string, any> = { survivors: newSurvivors, eliminated: newEliminated }
    if (newSurvivors.length <= 1) {
      update.status = 'completed'
      if (newSurvivors.length === 1) {
        update.winnerId = newSurvivors[0]
        await sendNotification({
          userId: newSurvivors[0],
          type: 'system',
          title: 'Streak Battle vinta!',
          body: "Sei l'ultimo sopravvissuto!",
        })
      }
    }

    await doc.ref.update(update)
  }
})
