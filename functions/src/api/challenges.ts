import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStripe, PLATFORM_FEE_PERCENT } from '../utils/stripe'

const db = getFirestore()

export const createPaidChallenge = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, title, type, period, fitnessLevel, target, entryFee, startDate, endDate } = req.body

  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }
  if (userDoc.data()?.plan !== 'premium') {
    res.status(403).json({ error: 'Premium required to create paid challenges' })
    return
  }

  const challengeRef = await db.collection('challenges').add({
    title,
    type,
    period,
    fitnessLevel: fitnessLevel ?? 'all',
    target: target ?? null,
    participants: [userId],
    scores: {},
    prize: {
      type: 'pool',
      value: 'Pool Prize',
      entryFee,
      totalPool: 0,
      platformFee: PLATFORM_FEE_PERCENT,
      payoutStatus: 'pending',
    },
    startDate,
    endDate,
    settled: false,
    createdBy: userId,
    createdAt: Date.now(),
  })

  res.json({ challengeId: challengeRef.id })
})

export const joinPaidChallenge = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, challengeId } = req.body
  const stripe = getStripe()

  const challengeDoc = await db.collection('challenges').doc(challengeId).get()
  if (!challengeDoc.exists) { res.status(404).json({ error: 'Challenge not found' }); return }

  const challenge = challengeDoc.data()!
  if (challenge.participants.includes(userId)) {
    res.status(400).json({ error: 'Already joined' })
    return
  }

  const entryFee = challenge.prize?.entryFee
  if (!entryFee || challenge.prize?.type !== 'pool') {
    res.status(400).json({ error: 'Not a paid challenge' })
    return
  }

  const userDoc = await db.collection('users').doc(userId).get()
  const user = userDoc.data()!
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebaseUid: userId },
    })
    customerId = customer.id
    await db.collection('users').doc(userId).update({ stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: `Entry: ${challenge.title}` },
        unit_amount: Math.round(entryFee * 100),
      },
      quantity: 1,
    }],
    success_url: `${req.headers.origin}/challenges?joined=${challengeId}`,
    cancel_url: `${req.headers.origin}/challenges`,
    metadata: { firebaseUid: userId, challengeId, type: 'challenge_entry' },
  })

  res.json({ url: session.url })
})
