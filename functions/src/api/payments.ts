import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStripe, getWebhookSecret, PREMIUM_PRICE_ID } from '../utils/stripe'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

export const createCheckoutSession = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId } = req.body
  if (!userId) { res.status(400).json({ error: 'userId required' }); return }

  const stripe = getStripe()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }

  const user = userDoc.data()!
  let customerId = user.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { firebaseUid: userId },
    })
    customerId = customer.id
    await db.collection('users').doc(userId).update({ stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${req.headers.origin}/settings?payment=success`,
    cancel_url: `${req.headers.origin}/settings?payment=cancelled`,
    metadata: { firebaseUid: userId },
  })

  res.json({ url: session.url })
})

export const createConnectAccount = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId } = req.body
  if (!userId) { res.status(400).json({ error: 'userId required' }); return }

  const stripe = getStripe()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }

  const user = userDoc.data()!

  if (user.stripeConnectId) {
    const link = await stripe.accountLinks.create({
      account: user.stripeConnectId,
      refresh_url: `${req.headers.origin}/settings`,
      return_url: `${req.headers.origin}/settings?connect=success`,
      type: 'account_onboarding',
    })
    res.json({ url: link.url })
    return
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    metadata: { firebaseUid: userId },
    capabilities: { transfers: { requested: true } },
  })

  await db.collection('users').doc(userId).update({ stripeConnectId: account.id })

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.headers.origin}/settings`,
    return_url: `${req.headers.origin}/settings?connect=success`,
    type: 'account_onboarding',
  })

  res.json({ url: link.url })
})

export const stripeWebhook = onRequest(async (req, res) => {
  const stripe = getStripe()
  const sig = req.headers['stripe-signature'] as string

  let event
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, getWebhookSecret())
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.firebaseUid
      if (userId && session.mode === 'subscription') {
        await db.collection('users').doc(userId).update({ plan: 'premium' })
        await db.collection('payments').add({
          userId,
          type: 'subscription',
          amount: session.amount_total,
          currency: session.currency,
          stripeSessionId: session.id,
          createdAt: Date.now(),
        })
        await sendNotification({
          userId,
          type: 'system',
          title: 'Benvenuto Premium!',
          body: 'Il tuo abbonamento Premium e attivo!',
        })
      }
      // Handle challenge entry payment
      if (userId && session.metadata?.type === 'challenge_entry') {
        const challengeId = session.metadata.challengeId
        if (challengeId) {
          const challengeRef = db.collection('challenges').doc(challengeId)
          const challengeDoc = await challengeRef.get()
          if (challengeDoc.exists) {
            const challenge = challengeDoc.data()!
            const entryFee = challenge.prize?.entryFee ?? 0
            await challengeRef.update({
              participants: [...(challenge.participants ?? []), userId],
              'prize.totalPool': (challenge.prize?.totalPool ?? 0) + entryFee,
            })
            await db.collection('payments').add({
              userId,
              type: 'challenge_entry',
              amount: Math.round(entryFee * 100),
              currency: 'eur',
              challengeId,
              stripeSessionId: session.id,
              createdAt: Date.now(),
            })
          }
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string
      const usersSnap = await db.collection('users')
        .where('stripeCustomerId', '==', customerId).limit(1).get()
      if (!usersSnap.empty) {
        const userId = usersSnap.docs[0].id
        await db.collection('users').doc(userId).update({ plan: 'free' })
        await sendNotification({
          userId,
          type: 'system',
          title: 'Pagamento fallito',
          body: 'Il tuo abbonamento Premium e stato sospeso. Aggiorna il metodo di pagamento.',
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const customerId = sub.customer as string
      const usersSnap = await db.collection('users')
        .where('stripeCustomerId', '==', customerId).limit(1).get()
      if (!usersSnap.empty) {
        await db.collection('users').doc(usersSnap.docs[0].id).update({ plan: 'free' })
      }
      break
    }
  }

  res.json({ received: true })
})
