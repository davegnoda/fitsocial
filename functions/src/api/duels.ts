import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

const DURATION_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

export const createDuel = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { challengerId, opponentId, type, duration, betAmount } = req.body

  const challengerDoc = await db.collection('users').doc(challengerId).get()
  const opponentDoc = await db.collection('users').doc(opponentId).get()
  if (!challengerDoc.exists || !opponentDoc.exists) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const duelRef = await db.collection('duels').add({
    challenger: challengerId,
    challengerName: challengerDoc.data()!.name,
    opponent: opponentId,
    opponentName: opponentDoc.data()!.name,
    type: type ?? 'steps',
    duration: duration ?? '24h',
    status: 'pending',
    scores: { [challengerId]: 0, [opponentId]: 0 },
    bet: betAmount ? { amount: betAmount, currency: 'EUR' } : null,
    createdAt: Date.now(),
    endsAt: 0,
  })

  await sendNotification({
    userId: opponentId,
    type: 'duel',
    title: 'Sfida 1v1!',
    body: `${challengerDoc.data()!.name} ti ha sfidato a un duello!`,
    data: { duelId: duelRef.id, challengerId },
  })

  res.json({ duelId: duelRef.id })
})

export const acceptDuel = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, duelId } = req.body

  const duelDoc = await db.collection('duels').doc(duelId).get()
  if (!duelDoc.exists) { res.status(404).json({ error: 'Duel not found' }); return }

  const duel = duelDoc.data()!
  if (duel.opponent !== userId) { res.status(403).json({ error: 'Not the opponent' }); return }
  if (duel.status !== 'pending') { res.status(400).json({ error: 'Duel not pending' }); return }

  const durationMs = DURATION_MS[duel.duration] ?? DURATION_MS['24h']

  await duelDoc.ref.update({
    status: 'active',
    endsAt: Date.now() + durationMs,
  })

  await sendNotification({
    userId: duel.challenger,
    type: 'duel',
    title: 'Duello accettato!',
    body: `${duel.opponentName} ha accettato la sfida!`,
    data: { duelId },
  })

  res.json({ success: true })
})
